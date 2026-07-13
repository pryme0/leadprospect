import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { syncPipelineForOrg, getPipelineStats, emptyPipelineStats } from '@/lib/pipeline/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pipeline/stats — funnel counts, win rate, value totals, avg cycle
 * time, and overdue-follow-up count for the logged-in org's pipeline.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'This feature requires an active Lead Intelligence subscription.' }, { status: 403 });
  }

  try {
    const { sbu } = await resolveUserSbu(req);
    if (!sbu) return NextResponse.json(emptyPipelineStats());
    await syncPipelineForOrg(user.org, sbu);
    const stats = await getPipelineStats(user.org);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[GET /api/pipeline/stats]', err);
    return NextResponse.json(emptyPipelineStats(), { status: 200 });
  }
}
