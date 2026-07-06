import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile, setOrgAnalysis } from '@/lib/settings/org-store';
import { provisionAndCrawl, sbuIdForUser } from '@/lib/crawler/control-client';
import { hasModule } from '@/lib/subscription/server-store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leads/provision — register the logged-in company's SBU + keywords in
 * the crawler from the ALREADY-stored website analysis (no LLM / website fetch).
 * Use this to (re)sync a user to the crawler when they were analysed but never
 * provisioned (e.g. before the DB-provisioning path existed). Idempotent.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  // Entitlement gate — mirrors /api/leads/generate. Blocks re-provisioning (which
  // would re-activate the SBU) once the org's access window has elapsed.
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json(
      { message: 'Your access has expired. Subscribe to resume lead generation.', code: 'access_expired' },
      { status: 403 },
    );
  }

  const profile = await getOrgProfile(user.org);
  const keywords = profile?.analysis?.keywords ?? [];
  if (keywords.length === 0) {
    return NextResponse.json(
      { message: 'No stored analysis yet. Run "Analyse & generate" in Settings first.' },
      { status: 400 },
    );
  }

  const analysis = profile!.analysis!;
  const provision = await provisionAndCrawl({
    userId: user.org,
    companyName: profile!.company_name,
    keywords,
    context: { summary: analysis.summary, target_audience: analysis.target_audience, pain_points: analysis.pain_points },
    startCrawl: false, // the crawler's cron picks up the SBU on its next tick
  });

  const sbuId = provision.sbuId || sbuIdForUser(user.org);
  await setOrgAnalysis(user.org, sbuId, profile!.analysis!);

  return NextResponse.json({
    ok: provision.sbuReady,
    crawler_sbu_id: sbuId,
    sbu_ready: provision.sbuReady,
    keywords_registered: provision.keywordsAdded,
    errors: provision.errors,
  });
}
