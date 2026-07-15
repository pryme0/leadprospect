import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getOrgProfile, setOrgAnalysis } from '@/lib/settings/org-store';
import { fetchWebsiteText } from '@/lib/leads/website-fetch';
import { analyzeWebsite, analysisConfigured } from '@/lib/leads/analyze';
import { provisionAndCrawl, sbuIdForUser } from '@/lib/crawler/control-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leads/generate — last analysis status for the logged-in user.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const subscribed = await hasModule(user.org, 'leads');
  const profile = await getOrgProfile(user.org);

  return NextResponse.json({
    subscribed,
    website: profile?.website ?? '',
    analyzed_at: profile?.analyzed_at ?? null,
    crawler_sbu_id: profile?.crawler_sbu_id ?? null,
    analysis: profile?.analysis ?? null,
  });
}

/**
 * POST /api/leads/generate — the end-to-end flow:
 *   1. auth  2. subscription gate  3. load profile  4. fetch website
 *   5. Claude analysis  6. provision per-user SBU + keywords (+ optional crawl)
 *   7. persist analysis + sbu id  →  8. return summary
 *
 * Body (optional): { start_crawl?: boolean }
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  // 2. Server-side subscription gate — Lead Intelligence = the 'leads' module.
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json(
      { message: 'This feature requires an active Lead Intelligence subscription.' },
      { status: 403 },
    );
  }

  if (!analysisConfigured()) {
    return NextResponse.json(
      { message: 'Website analysis is not configured (set OPENAI_API_KEY or GEMINI_API_KEY).' },
      { status: 503 },
    );
  }

  // 3. Load the user's saved company profile.
  const profile = await getOrgProfile(user.org);
  if (!profile || !profile.website.trim()) {
    return NextResponse.json(
      { message: 'Add your company website in Settings before generating leads.' },
      { status: 400 },
    );
  }

  let startCrawl = true;
  try {
    const body = await req.json();
    if (typeof body?.start_crawl === 'boolean') startCrawl = body.start_crawl;
  } catch { /* no body — keep default */ }

  // 4. Fetch website text.
  const site = await fetchWebsiteText(profile.website);
  if (!site) {
    return NextResponse.json(
      { message: `Could not fetch content from ${profile.website}. Check the URL is correct and public.` },
      { status: 422 },
    );
  }

  // 5. Analyze with Claude.
  let analysis;
  try {
    analysis = await analyzeWebsite({
      companyName: profile.company_name,
      website: profile.website,
      about: profile.about,
      services: profile.services,
      industry: profile.industry,
      websiteText: site.text,
    });
  } catch (err) {
    console.error('[leads/generate] analysis failed', err);
    return NextResponse.json({ message: 'Website analysis failed. Please try again.' }, { status: 502 });
  }

  if (analysis.keywords.length === 0) {
    return NextResponse.json(
      { message: 'Analysis produced no usable search keywords. Add more detail in your company profile and retry.' },
      { status: 422 },
    );
  }

  // 6. Provision per-user SBU + keywords in the crawler (+ optional crawl).
  const provision = await provisionAndCrawl({
    userId: user.org,
    companyName: profile.company_name,
    keywords: analysis.keywords,
    socialKeywords: { tiktok: analysis.keywords_tiktok, instagram: analysis.keywords_instagram, threads: analysis.keywords_threads },
    context: { summary: analysis.summary, target_audience: analysis.target_audience, pain_points: analysis.pain_points },
    startCrawl,
  });

  // 7. Persist analysis + the SBU id used to scope this user's leads. Use the
  //    provisioned sbu id (always the deterministic per-user id) so lead reads
  //    can scope even when the crawler wasn't reachable this run.
  const sbuId = provision.sbuId || sbuIdForUser(user.org);
  await setOrgAnalysis(user.org, sbuId, analysis);

  // 8. Return the summary + provisioning status.
  return NextResponse.json({
    ok: true,
    crawler_sbu_id: sbuId,
    analysis,
    pages_analyzed: site.pagesFetched,
    provisioning: {
      crawler_connected: !provision.skipped,
      sbu_ready: provision.sbuReady,
      keywords_added: provision.keywordsAdded,
      crawls_started: provision.crawlsStarted,
      errors: provision.errors,
    },
  });
}

/**
 * PATCH /api/leads/generate — save user-edited search signals (keywords) without
 * re-running the website analysis. Syncs the new set to the crawler and
 * deactivates any removed terms so crawls streamline to exactly what the user
 * wants. Body: { keywords: string[] }.
 */
export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json(
      { message: 'This feature requires an active Lead Intelligence subscription.' },
      { status: 403 },
    );
  }

  const profile = await getOrgProfile(user.org);
  if (!profile?.analysis) {
    return NextResponse.json(
      { message: 'Run "Analyse & generate" once before editing search signals.' },
      { status: 400 },
    );
  }

  let raw: unknown = [];
  try {
    const body = await req.json();
    raw = body?.keywords;
  } catch { /* fall through to validation below */ }

  if (!Array.isArray(raw)) {
    return NextResponse.json({ message: 'keywords must be an array of strings.' }, { status: 400 });
  }

  // Sanitize: trim, drop empties/over-long, de-dupe case-insensitively, cap count.
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const item of raw) {
    const k = typeof item === 'string' ? item.trim() : '';
    if (!k || k.length > 120) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(k);
    if (keywords.length >= 60) break; // allow the larger generated/edited keyword sets through
  }

  if (keywords.length === 0) {
    return NextResponse.json({ message: 'Keep at least one search signal.' }, { status: 422 });
  }

  const updated = { ...profile.analysis, keywords };

  // Sync to the crawler: upsert the current set + deactivate anything removed.
  const provision = await provisionAndCrawl({
    userId: user.org,
    companyName: profile.company_name,
    keywords,
    socialKeywords: { tiktok: updated.keywords_tiktok, instagram: updated.keywords_instagram, threads: updated.keywords_threads },
    context: { summary: updated.summary, target_audience: updated.target_audience, pain_points: updated.pain_points },
    startCrawl: false,
    deactivateMissing: true,
  });

  const sbuId = profile.crawler_sbu_id || provision.sbuId || sbuIdForUser(user.org);
  await setOrgAnalysis(user.org, sbuId, updated);

  return NextResponse.json({
    ok: true,
    analysis: updated,
    provisioning: {
      crawler_connected: !provision.skipped,
      sbu_ready: provision.sbuReady,
      keywords_added: provision.keywordsAdded,
      errors: provision.errors,
    },
  });
}
