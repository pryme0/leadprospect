import { NextResponse } from 'next/server';
import { getDb, countMentions, ensureCommsReady } from '@/lib/comms/db';
import { getUserFromRequest } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function fetchUnipileChatCount(): Promise<number> {
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn    = process.env.UNIPILE_DSN;
  if (!apiKey || !dsn) return 0;

  try {
    // Only count chats for CURRENTLY connected accounts. With no accounts we must
    // return 0 rather than an unscoped /chats call — otherwise the KPI keeps
    // showing conversations after a user disconnects everything (privacy).
    const accRes = await fetch(`${dsn}/api/v1/accounts`, {
      headers: { 'X-API-KEY': apiKey, 'accept': 'application/json' },
      cache: 'no-store',
    });
    const accounts = accRes.ok ? (((await accRes.json()) as { items?: unknown[] }).items ?? []) : [];
    if (accounts.length === 0) return 0;

    const res = await fetch(`${dsn}/api/v1/chats?limit=50`, {
      headers: { 'X-API-KEY': apiKey, 'accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const data = await res.json() as { items?: unknown[] };
    return (data.items ?? []).length;
  } catch {
    return 0;
  }
}

export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

    const db = getDb();
    await ensureCommsReady();
    const sentRow   = (await db.query('SELECT COUNT(*)::int as count FROM sent_replies')).rows[0] as { count: number };
    const channelRow = (await db.query('SELECT COUNT(*)::int as count FROM connected_channels')).rows[0] as { count: number };
    const localConvoRow = (await db.query('SELECT COUNT(*)::int as count FROM conversations')).rows[0] as { count: number };

    const unipileCount = await fetchUnipileChatCount();
    const totalConversations = unipileCount + localConvoRow.count;
    const mentionsDetected = await countMentions(db, user.org);

    return NextResponse.json({
      activeConversations: totalConversations,
      avgResponseTime: totalConversations > 0 ? '—' : '—',
      mentionsDetected,
      repliesSent: sentRow.count,
      csatScore: '—',
      connectedChannels: channelRow.count,
    });
  } catch (err) {
    console.error('[GET /api/comms/stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
