import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/comms/db';
import { getUserFromRequest } from '@/lib/auth/session';
import { checkConnectedAccountCap } from '@/lib/subscription/limits';

/* POST /api/comms/channels/:id — connect a channel */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { id } = params;
    const body = await req.json() as { handle: string; secondary?: string };

    if (!body.handle?.trim()) {
      return NextResponse.json({ error: 'handle is required' }, { status: 400 });
    }

    // Connected-account cap (Basic/Pro/Max) — only counts accounts other than
    // the one being (re)connected, so re-saving an existing channel never trips it.
    const cap = await checkConnectedAccountCap(db, user.sub, id);
    if (!cap.ok) {
      return NextResponse.json({ error: cap.message, code: 'account_limit' }, { status: 402 });
    }

    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    db.prepare(`
      INSERT INTO connected_channels (channel_id, user_id, handle, connected_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, channel_id) DO UPDATE SET handle = excluded.handle, connected_at = excluded.connected_at
    `).run(id, user.sub, body.handle.trim(), now);

    return NextResponse.json({ success: true, account: { channelId: id, handle: body.handle.trim(), connectedAt: now } });
  } catch (err) {
    console.error('[POST /api/comms/channels/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* DELETE /api/comms/channels/:id — disconnect a channel */
export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    db.prepare('DELETE FROM connected_channels WHERE user_id = ? AND channel_id = ?').run(user.sub, params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/comms/channels/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
