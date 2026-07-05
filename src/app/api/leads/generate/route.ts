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

  const subscribed = await hasModule(user.sub, 'leads');
  const profile = await getOrgProfile(user.sub);

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
  if (!(await hasModule(user.sub, 'leads'))) {
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
  const profile = await getOrgProfile(user.sub);
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
    userId: user.sub,
    companyName: profile.company_name,
    keywords: analysis.keywords,
    socialKeywords: { tiktok: analysis.keywords_tiktok, instagram: analysis.keywords_instagram },
    context: { summary: analysis.summary, target_audience: analysis.target_audience, pain_points: analysis.pain_points },
    startCrawl,
  });

  // 7. Persist analysis + the SBU id used to scope this user's leads. Use the
  //    provisioned sbu id (always the deterministic per-user id) so lead reads
  //    can scope even when the crawler wasn't reachable this run.
  const sbuId = provision.sbuId || sbuIdForUser(user.sub);
  await setOrgAnalysis(user.sub, sbuId, analysis);

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
