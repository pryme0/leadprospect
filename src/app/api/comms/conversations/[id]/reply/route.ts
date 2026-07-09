import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureCommsReady } from '@/lib/comms/db';

async function sendUnipileMessage(chatId: string, text: string): Promise<{ id?: string; error?: string }> {
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn    = process.env.UNIPILE_DSN;
  if (!apiKey || !dsn) return { error: 'Unipile not configured' };

  try {
    const res = await fetch(`${dsn}/api/v1/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      console.error('[Unipile send message error]', res.status, JSON.stringify(data));
      return { error: (data.message as string) ?? 'Failed to send message' };
    }

    return { id: (data.id as string) ?? undefined };
  } catch (err) {
    console.error('[sendUnipileMessage]', err);
    return { error: 'Network error' };
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json() as { text: string; tone: string; kb_enabled: boolean };

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Reply text is required' }, { status: 400 });
    }

    const text = body.text.trim();
    const now  = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const db = getDb();
    await ensureCommsReady();
    const localConvo = (await db.query('SELECT id FROM conversations WHERE id = $1', [id])).rows[0];

    if (localConvo) {
      /* Local (Telegram, Discord, etc.) — persist to DB only */
      await db.query(`INSERT INTO sent_replies (conversation_id, text, tone, kb_enabled) VALUES ($1, $2, $3, $4)`,
        [id, text, body.tone ?? 'professional', body.kb_enabled ? 1 : 0]);

      const msgId = `sent_${Date.now()}`;
      await db.query(`INSERT INTO messages (id, conversation_id, from_type, text, time) VALUES ($1, $2, 'agent', $3, $4)`,
        [msgId, id, text, now]);
      await db.query('UPDATE conversations SET unread = 0 WHERE id = $1', [id]);

      return NextResponse.json({ success: true, messageId: msgId, sentAt: now });
    }

    /* Unipile chat — send via API */
    const result = await sendUnipileMessage(id, text);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    /* Log the sent reply for stats tracking */
    try {
      await db.query(`INSERT INTO sent_replies (conversation_id, text, tone, kb_enabled) VALUES ($1, $2, $3, $4)`,
        [id, text, body.tone ?? 'professional', body.kb_enabled ? 1 : 0]);
    } catch { /* non-critical */ }

    const msgId = result.id ?? `sent_${Date.now()}`;
    return NextResponse.json({ success: true, messageId: msgId, sentAt: now });
  } catch (err) {
    console.error('[POST /api/comms/conversations/:id/reply]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
