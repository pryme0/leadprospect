import { NextResponse } from 'next/server';
import { signalStats } from '@/lib/crawler/signals-db';
import { toUiStats } from '@/lib/crawler/map';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile } from '@/lib/settings/org-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crawler/stats — signal totals + breakdowns for the logged-in user.
 * Scoped to the user's crawler SBU; no SBU → zeroed stats (nothing generated).
 */
export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    const sbu = user ? getOrgProfile(user.sub)?.crawler_sbu_id ?? null : null;

    const source = new URL(req.url).searchParams.get('source') || undefined;
    // Sentinel SBU when none set → matches no rows → well-formed zero stats.
    const stats = await signalStats({ source, sbu: sbu ?? '__no_sbu__' });
    return NextResponse.json({ ...toUiStats(stats), needs_generation: !sbu });
  } catch (err) {
    console.error('[GET /api/crawler/stats]', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
