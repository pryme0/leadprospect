import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureCommsReady } from '@/lib/comms/db';

type UnipileMessage = {
  id?: string;
  text?: string;
  body?: string;
  sender_id?: string;
  is_sender?: number | boolean;   /* 1/true = outbound (agent) */
  timestamp?: string;              /* ISO string from Unipile */
};

function formatTime(timestamp?: string): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function fetchUnipileMessages(chatId: string): Promise<UnipileMessage[]> {
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn    = process.env.UNIPILE_DSN;
  if (!apiKey || !dsn) return [];

  try {
    const res = await fetch(`${dsn}/api/v1/chats/${encodeURIComponent(chatId)}/messages?limit=50`, {
      headers: { 'X-API-KEY': apiKey, 'accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json() as { items?: UnipileMessage[] };
    /* Unipile returns newest-first; reverse for chronological display */
    return [...(data.items ?? [])].reverse();
  } catch {
    return [];
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const { id } = params;

    /* Try local DB first (Telegram, Discord, etc.) */
    await ensureCommsReady();
    const convo = (await db.query('SELECT * FROM conversations WHERE id = $1', [id])).rows[0];
    if (convo) {
      const messages = (await db.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [id])).rows;
      const timeline = (await db.query('SELECT * FROM timeline_events WHERE conversation_id = $1 ORDER BY id ASC', [id])).rows;
      const aiReply  = (await db.query('SELECT text FROM ai_replies WHERE conversation_id = $1', [id])).rows[0] as { text: string } | undefined;
      return NextResponse.json({ conversation: convo, messages, timeline, aiReply: aiReply?.text ?? '' });
    }

    /* Not in local DB — try Unipile */
    const unipileMsgs = await fetchUnipileMessages(id);
    if (unipileMsgs.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = unipileMsgs.map((m, idx) => ({
      id: m.id ?? `msg_${idx}`,
      from_type: m.is_sender ? 'agent' : 'customer',
      text: m.text ?? m.body ?? '',
      time: formatTime(m.timestamp),
    }));

    return NextResponse.json({ conversation: { id }, messages, timeline: [], aiReply: '' });
  } catch (err) {
    console.error('[GET /api/comms/conversations/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
