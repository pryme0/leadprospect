/**
 * Unipile outbound helper for starting a NEW conversation with a lead.
 *
 * Pulse's existing reply route only replies to an EXISTING chat id. To message a
 * crawler-found lead we must start a fresh chat from the connected account to the
 * lead's handle. Unipile's `POST /api/v1/chats` supports this (account_id +
 * attendees_ids + text). Handle→provider-id resolution is best-effort; when it
 * can't be done we return a soft failure so the caller falls back to assisted send.
 *
 * Supported for messaging: Instagram, LinkedIn, X (Unipile DM-capable). TikTok is
 * NOT supported by Unipile and never routed here.
 */

/** Our platform id → Unipile account `type`. */
const PLATFORM_TO_UNIPILE_TYPE: Record<string, string> = {
  instagram: 'INSTAGRAM',
  linkedin: 'LINKEDIN',
  x: 'TWITTER',
  twitter: 'TWITTER',
};

export function unipileConfigured(): boolean {
  return !!(process.env.UNIPILE_API_KEY && process.env.UNIPILE_DSN);
}

/** Platforms we can attempt a real DM for via Unipile. */
export function isUnipileMessagable(platform: string): boolean {
  return platform.toLowerCase() in PLATFORM_TO_UNIPILE_TYPE;
}

type UnipileAccount = { type: string; id: string };

async function unipileFetch(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const apiKey = process.env.UNIPILE_API_KEY!;
  const dsn = process.env.UNIPILE_DSN!;
  const res = await fetch(`${dsn}${path}`, {
    ...init,
    headers: { 'X-API-KEY': apiKey, 'accept': 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  let data: Record<string, unknown> = {};
  try { data = (await res.json()) as Record<string, unknown>; } catch { /* empty */ }
  return { ok: res.ok, status: res.status, data };
}

/** Find the connected account id for a platform (first matching account). */
async function accountIdFor(platform: string): Promise<string | null> {
  const type = PLATFORM_TO_UNIPILE_TYPE[platform.toLowerCase()];
  if (!type) return null;
  const { ok, data } = await unipileFetch('/api/v1/accounts');
  if (!ok) return null;
  const items = (data.items as UnipileAccount[] | undefined) ?? [];
  return items.find((a) => a.type === type)?.id ?? null;
}

export interface OutboundResult {
  sent: boolean;
  chatId?: string;
  error?: string;
}

/**
 * Start a new chat and send `text` to `handle` on `platform`. Returns
 * { sent:false } (no throw) whenever the platform/account/recipient can't be
 * resolved, so the caller degrades to assisted send.
 */
export async function sendOutbound(platform: string, handle: string, text: string): Promise<OutboundResult> {
  if (!unipileConfigured()) return { sent: false, error: 'Unipile not configured' };
  if (!isUnipileMessagable(platform)) return { sent: false, error: `${platform} not supported by Unipile` };
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (!cleanHandle) return { sent: false, error: 'No recipient handle' };

  const accountId = await accountIdFor(platform);
  if (!accountId) return { sent: false, error: `No connected ${platform} account` };

  // Unipile "start new chat": account_id + attendees_ids (the recipient handle/
  // provider id) + text. Handle resolution varies per provider; pass the handle
  // as the attendee identifier and let Unipile resolve it.
  const { ok, status, data } = await unipileFetch('/api/v1/chats', {
    method: 'POST',
    body: JSON.stringify({ account_id: accountId, attendees_ids: [cleanHandle], text }),
  });
  if (!ok) {
    return { sent: false, error: `Unipile start-chat failed (${status}): ${String(data.message ?? '')}`.trim() };
  }
  return { sent: true, chatId: (data.id as string) ?? (data.chat_id as string) ?? undefined };
}
