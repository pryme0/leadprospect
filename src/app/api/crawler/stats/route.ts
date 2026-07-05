import { NextResponse } from 'next/server';
import { signalStats, emptySignalStats } from '@/lib/crawler/signals-db';
import { toUiStats } from '@/lib/crawler/map';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crawler/stats — signal totals + breakdowns for the logged-in user.
 * Scoped to the user's crawler SBU; no SBU → zeroed stats (nothing generated).
 */
export async function GET(req: Request) {
  try {
    const { sbu, provisioned } = await resolveUserSbu(req);

    const source = new URL(req.url).searchParams.get('source') || undefined;
    // Sentinel SBU when unauthenticated → matches no rows → well-formed zero stats.
    const stats = await signalStats({ source, sbu: sbu ?? '__no_sbu__' });
    return NextResponse.json({ ...toUiStats(stats), needs_generation: !provisioned });
  } catch (err) {
    // Crawler DB unreachable (Railway blip/pause) — degrade to zeros so the
    // polling dashboard shows a clean empty state instead of an error.
    console.error('[GET /api/crawler/stats]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ...toUiStats(emptySignalStats()), db_unavailable: true });
  }
}
