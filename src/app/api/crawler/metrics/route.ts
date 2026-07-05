import { NextResponse } from 'next/server';
import { dashboardMetrics, emptyDashboardMetrics } from '@/lib/crawler/signals-db';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crawler/metrics — dashboard aggregates for the logged-in user only.
 * Scoped to the user's crawler SBU (set by /api/leads/generate); with no SBU the
 * user hasn't generated their pipeline yet, so all metrics are zero.
 */
export async function GET(req: Request) {
  try {
    const { sbu, provisioned } = resolveUserSbu(req);

    // Unauthenticated → sentinel that matches no rows → well-formed zero payload
    // (never the global pool).
    const metrics = await dashboardMetrics(sbu ?? '__no_sbu__');
    return NextResponse.json({ ...metrics, needs_generation: !provisioned });
  } catch (err) {
    // Crawler DB unreachable (Railway blip/pause) — degrade to zeros so the
    // dashboard renders a clean empty state instead of a hard error.
    console.error('[GET /api/crawler/metrics]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ...emptyDashboardMetrics(), db_unavailable: true });
  }
}
