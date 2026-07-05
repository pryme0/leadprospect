import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile, setBrandTerms } from '@/lib/settings/org-store';
import { analyzeBrand, analysisConfigured } from '@/lib/leads/analyze';
import { fetchWebsiteText } from '@/lib/leads/website-fetch';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/brand/analyze — derive brand-monitoring terms for the
 * logged-in company from its website + profile, and save them.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  if (!analysisConfigured()) {
    return NextResponse.json({ message: 'Analysis is not configured (set OPENAI_API_KEY or GEMINI_API_KEY).' }, { status: 503 });
  }

  const profile = await getOrgProfile(user.sub);
  if (!profile?.company_name && !profile?.website) {
    return NextResponse.json({ message: 'Add your company name and website in Settings first.' }, { status: 400 });
  }

  let websiteText = '';
  if (profile.website) {
    try { websiteText = (await fetchWebsiteText(profile.website))?.text ?? ''; } catch { /* proceed with profile only */ }
  }

  try {
    const terms = await analyzeBrand({
      companyName: profile.company_name,
      website: profile.website,
      about: profile.about,
      services: profile.services,
      industry: profile.industry,
      summary: profile.analysis?.summary,
      websiteText,
    });
    const updated = await setBrandTerms(user.sub, terms, true);
    return NextResponse.json({ ok: true, brand: terms, profile: updated });
  } catch (err) {
    console.error('[POST /api/settings/brand/analyze]', err);
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Analysis failed.' }, { status: 500 });
  }
}
