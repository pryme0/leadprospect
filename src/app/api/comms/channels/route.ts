import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureCommsReady } from '@/lib/comms/db';
import { getUserFromRequest } from '@/lib/auth/session';

/* Unipile provider name → our internal channel IDs */
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

/* Unipile account uses `type` (not `provider`) */
type UnipileAccount = { type: string; id: string; name?: string; username?: string; email?: string; connection_params?: { im?: { username?: string } } };

async function fetchUnipileAccounts(): Promise<UnipileAccount[]> {
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn    = process.env.UNIPILE_DSN;
  if (!apiKey || !dsn) return [];

  try {
    const res = await fetch(`${dsn}/api/v1/accounts`, {
      headers: { 'X-API-KEY': apiKey, 'accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json() as { items?: UnipileAccount[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    await ensureCommsReady();
    type DbRow = { channel_id: string; handle: string; connected_at: string };
    const local = (await db.query('SELECT channel_id, handle, connected_at FROM connected_channels WHERE user_id = $1', [user.org])).rows as DbRow[];

    /* Set of channel IDs managed by Unipile (we always defer to Unipile for these) */
    const unipileIds = new Set(Object.values(UNIPILE_TO_CHANNELS).flat());

    /* Non-Unipile channels come straight from local DB (Telegram bot, Discord, HubSpot, etc.) */
    const nonUnipile = local.filter((row) => !unipileIds.has(row.channel_id));

    /* Sync real Unipile accounts */
    const unipileAccounts = await fetchUnipileAccounts();
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    /* Build the list of Unipile-backed connected channels */
    const unipileMapped: DbRow[] = [];
    for (const account of unipileAccounts) {
      const channelIds = UNIPILE_TO_CHANNELS[account.type] ?? [];
      /* Best display name: connection_params username > name > account id */
      const handle = account.connection_params?.im?.username ?? account.name ?? account.email ?? account.id;
      for (const channelId of channelIds) {
        await db.query(`
          INSERT INTO connected_channels (channel_id, user_id, handle, connected_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, channel_id) DO UPDATE SET handle = EXCLUDED.handle, connected_at = EXCLUDED.connected_at
        `, [channelId, user.org, handle, now]);
        unipileMapped.push({ channel_id: channelId, handle, connected_at: now });
      }
    }

    /* Remove this user's Unipile channels from DB that are no longer connected
     * in Unipile — scoped by user_id so disconnecting doesn't touch other users. */
    const activeUnipileChannelIds = new Set(unipileMapped.map((u) => u.channel_id));
    for (const channelId of Array.from(unipileIds)) {
      if (!activeUnipileChannelIds.has(channelId)) {
        await db.query('DELETE FROM connected_channels WHERE user_id = $1 AND channel_id = $2', [user.org, channelId]);
      }
    }

    return NextResponse.json({ connected: [...nonUnipile, ...unipileMapped] });
  } catch (err) {
    console.error('[GET /api/comms/channels]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
