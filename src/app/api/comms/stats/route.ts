import { NextResponse } from 'next/server';
import { getDb, countMentions } from '@/lib/comms/db';
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
    const sentRow   = db.prepare('SELECT COUNT(*) as count FROM sent_replies').get() as { count: number };
    const channelRow = db.prepare('SELECT COUNT(*) as count FROM connected_channels').get() as { count: number };
    const localConvoRow = db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };

    const unipileCount = await fetchUnipileChatCount();
    const totalConversations = unipileCount + localConvoRow.count;
    const mentionsDetected = countMentions(db, user.sub);

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
