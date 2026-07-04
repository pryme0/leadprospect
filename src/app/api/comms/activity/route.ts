import { NextResponse } from 'next/server';
import { getDb, listRecentActivity, commsActivitySeries } from '@/lib/comms/db';
import { getUserFromRequest } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** GET /api/comms/activity — the logged-in user's recent events + 7-day series. */
export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

    const db = getDb();
    return NextResponse.json({
      activity: listRecentActivity(db, user.sub, 10),
      chart: commsActivitySeries(db, user.sub),
    });
  } catch (err) {
    console.error('[GET /api/comms/activity]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
