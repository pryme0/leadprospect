import { NextResponse } from 'next/server';
import { getLeadsDb, listUnsynced } from '@/lib/leads/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leads/sync — push un-synced leads to the CRM (GoHighLevel).
 *
 * Real integration is credential-gated: without GHL_API_KEY / GHL_LOCATION_ID
 * we do NOT fabricate contact ids. We report how many leads are waiting so the
 * UI is truthful about the pending queue. Wire the real GHL calls where noted
 * once credentials are configured, then call markLeadSynced() per success.
 */
export async function POST() {
  try {
    const db = getLeadsDb();
    const unsynced = await listUnsynced(db);

    const configured = !!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
    if (!configured) {
      return NextResponse.json({
        queued: unsynced.length,
        synced: 0,
        configured: false,
        message: 'CRM not configured — set GHL_API_KEY and GHL_LOCATION_ID to enable sync.',
      });
    }

    // TODO: real GHL sync — for each unsynced lead, create/upsert the CRM
    // contact, then markLeadSynced(db, lead.id, contactId). Left unimplemented
    // rather than faked so no placeholder contact ids are ever written.
    return NextResponse.json({
      queued: unsynced.length,
      synced: 0,
      configured: true,
      message: 'GHL credentials detected but the sync worker is not implemented yet.',
    });
  } catch (err) {
    console.error('[POST /api/leads/sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
