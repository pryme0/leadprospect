import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile } from '@/lib/settings/org-store';
import { analyzeCompanyContext, analysisConfigured } from '@/lib/leads/analyze';
import { fetchWebsiteText } from '@/lib/leads/website-fetch';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/context/autofill — crawl the logged-in company's website
 * and derive the "Company Context" fields (industry, about, services,
 * expectations). Returns suggestions for the operator to review; it does NOT
 * persist them — the user edits and hits Save Changes.
 * Optional body: { website } to analyze a URL not yet saved to the profile.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  if (!analysisConfigured()) {
    return NextResponse.json(
      { message: 'Auto-fill is not configured (set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY).' },
      { status: 503 },
    );
  }

  let body: { website?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const profile = await getOrgProfile(user.org);
  const website = (body.website || profile?.website || '').trim();
  if (!website) {
    return NextResponse.json({ message: 'Add your website first, then try auto-fill.' }, { status: 400 });
  }

  const fetched = await fetchWebsiteText(website).catch(() => null);
  if (!fetched?.text) {
    return NextResponse.json(
      { message: `Couldn't read ${website}. Check the URL is correct and publicly reachable.` },
      { status: 422 },
    );
  }

  try {
    const context = await analyzeCompanyContext({
      companyName: profile?.company_name ?? '',
      website,
      industry: profile?.industry,
      about: profile?.about,
      services: profile?.services,
      websiteText: fetched.text,
    });
    return NextResponse.json({ ok: true, context, pagesFetched: fetched.pagesFetched });
  } catch (err) {
    console.error('[POST /api/settings/context/autofill]', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Auto-fill failed.' },
      { status: 500 },
    );
  }
}
