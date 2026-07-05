import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/comms/db';
import { getUserFromRequest } from '@/lib/auth/session';
import { checkConnectedAccountCap } from '@/lib/subscription/limits';

/* Unipile provider type → our internal channel IDs (must match the GET route). */
const UNIPILE_TO_CHANNELS: Record<string, string[]> = {
  LINKEDIN:  ['linkedin'],
  TWITTER:   ['x'],
  INSTAGRAM: ['instagram'],
  MESSENGER: ['messenger', 'facebook'],
  WHATSAPP:  ['whatsapp'],
  GOOGLE:    ['gmail'],
  OUTLOOK:   ['outlook'],
  SLACK:     ['slack'],
};
/* Reverse map: channel id → Unipile account type. */
const CHANNEL_TO_UNIPILE_TYPE: Record<string, string> = {};
for (const [type, ids] of Object.entries(UNIPILE_TO_CHANNELS)) for (const id of ids) CHANNEL_TO_UNIPILE_TYPE[id] = type;

type UnipileAccount = { type: string; id: string };

/** List Unipile accounts (empty when Unipile isn't configured). */
async function fetchUnipileAccounts(): Promise<UnipileAccount[]> {
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn = process.env.UNIPILE_DSN;
  if (!apiKey || !dsn) return [];
  try {
    const res = await fetch(`${dsn}/api/v1/accounts`, { headers: { 'X-API-KEY': apiKey, accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return [];
    return ((await res.json()) as { items?: UnipileAccount[] }).items ?? [];
  } catch { return []; }
}

/** Permanently disconnect (delete) a Unipile account so it stops re-syncing. */
async function deleteUnipileAccount(accountId: string): Promise<boolean> {
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn = process.env.UNIPILE_DSN;
  if (!apiKey || !dsn) return false;
  try {
    const res = await fetch(`${dsn}/api/v1/accounts/${encodeURIComponent(accountId)}`, {
      method: 'DELETE',
      headers: { 'X-API-KEY': apiKey, accept: 'application/json' },
    });
    return res.ok;
  } catch { return false; }
}

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

/**
 * DELETE /api/comms/channels/:id — disconnect a channel and clear its traction.
 *
 * For Unipile-backed channels (LinkedIn, Instagram, X, WhatsApp, Messenger…) the
 * account MUST be deleted in Unipile too — otherwise the GET route re-syncs it
 * from Unipile on the next load and the "disconnected" account reappears. We then
 * remove the local connection row and clear that platform's stored traction
 * (conversations + their messages/replies/timeline via cascade, and mentions),
 * scoped to the caller, so nothing lingers after a disconnect.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const channelId = params.id;
    const unipileType = CHANNEL_TO_UNIPILE_TYPE[channelId];

    // One Unipile account can back several channel ids (e.g. MESSENGER →
    // messenger + facebook); clear all of them together.
    const affected = unipileType ? UNIPILE_TO_CHANNELS[unipileType] : [channelId];

    // 1. Persist the disconnect: actually delete the account in Unipile so it
    //    can't re-sync back. Best-effort — local cleanup runs regardless.
    if (unipileType) {
      const accounts = await fetchUnipileAccounts();
      for (const acct of accounts.filter((a) => a.type === unipileType)) {
        await deleteUnipileAccount(acct.id);
      }
    }

    // 2. Remove the local connection + clear the platform's traction.
    const clear = db.transaction((channels: string[]) => {
      for (const cid of channels) {
        db.prepare('DELETE FROM connected_channels WHERE user_id = ? AND channel_id = ?').run(user.sub, cid);
        db.prepare('DELETE FROM mentions WHERE user_id = ? AND platform = ?').run(user.sub, cid);
        // Cascades to messages / ai_replies / timeline_events (foreign_keys ON).
        db.prepare('DELETE FROM conversations WHERE platform = ?').run(cid);
      }
    });
    clear(affected);

    return NextResponse.json({ success: true, cleared: affected });
  } catch (err) {
    console.error('[DELETE /api/comms/channels/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
