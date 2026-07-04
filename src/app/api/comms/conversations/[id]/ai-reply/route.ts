import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/comms/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const { id } = params;
    const body = await req.json() as { text: string };

    if (typeof body.text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO ai_replies (conversation_id, text, updated_at)
      VALUES (?, ?, unixepoch())
      ON CONFLICT(conversation_id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at
    `).run(id, body.text);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/comms/conversations/:id/ai-reply]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
