/**
 * Merged conversation source for the Comm Hub ("Pulse").
 *
 * Combines live Unipile chats with locally-stored (non-Unipile) conversations
 * into one list. Factored out of the /api/comms/conversations route so the
 * notifications endpoint can reuse the exact same data. Adds a numeric
 * `last_activity_ts` (unix seconds) so callers can sort / detect "new" items.
 */
import type Database from 'better-sqlite3';
import { getDb } from './db';

/* Unipile account_type → our channel id */
export const ACCOUNT_TYPE_TO_CHANNEL: Record<string, string> = {
  LINKEDIN: 'linkedin',
  TWITTER: 'x',
  INSTAGRAM: 'instagram',
  MESSENGER: 'messenger',
  WHATSAPP: 'whatsapp',
  GOOGLE: 'gmail',
  OUTLOOK: 'outlook',
  SLACK: 'slack',
  FACEBOOK: 'facebook',
};

type UnipileLastMessage = { text?: string; timestamp?: string };
type UnipileChat = {
  id: string;
  account_id?: string;
  account_type?: string;
  name?: string | null;
  unread?: number;
  unread_count?: number;
  timestamp?: string;
  lastMessage?: UnipileLastMessage | null;
  attendee_provider_id?: string;
};
type UnipileAttendee = { id?: string; name?: string; is_self?: number | boolean; picture_url?: string; provider_id?: string };

/** Pull a readable phone number out of a WhatsApp-style provider id (e.g. "2349055047774@s.whatsapp.net"). */
function phoneFromProviderId(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.split('@')[0].replace(/[^\d]/g, '');
  if (digits.length < 6) return null;
  return `+${digits}`;
}

export interface ConversationItem {
  id: string;
  customer: string;
  initials: string;
  platform: string;
  sentiment: string;
  snippet: string;
  time_ago: string;
  unread: number;
  location: string | null;
  language: string | null;
  intent: string | null;
  urgency: number;
  first_contact: string | null;
  source?: string;
  /** Unix seconds of the latest activity — used for sorting & new-item detection. */
  last_activity_ts: number;
}

function formatTimeAgo(isoDate?: string): string {
  if (!isoDate) return 'recently';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2) || 'C';
}

async function unipileGet<T>(path: string, apiKey: string, dsn: string): Promise<T | null> {
  try {
    const res = await fetch(`${dsn}${path}`, {
      headers: { 'X-API-KEY': apiKey, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function fetchChatEnriched(chat: UnipileChat, apiKey: string, dsn: string) {
  const id = encodeURIComponent(chat.id);
  const [attendeesData, chatDetail] = await Promise.all([
    unipileGet<{ items?: UnipileAttendee[] }>(`/api/v1/chats/${id}/attendees`, apiKey, dsn),
    unipileGet<UnipileChat>(`/api/v1/chats/${id}`, apiKey, dsn),
  ]);
  const other = attendeesData?.items?.find((a) => !a.is_self);
  const snippet = chatDetail?.lastMessage?.text?.trim() ?? null;
  // Best display name: the contact's real name → the chat title → their phone
  // number (WhatsApp often has no display name, only a provider id).
  const name = other?.name?.trim() || null;
  const chatName = chat.name?.trim() || chatDetail?.name?.trim() || null;
  const phone =
    phoneFromProviderId(other?.provider_id) ||
    phoneFromProviderId(other?.id) ||
    phoneFromProviderId(chat.attendee_provider_id) ||
    phoneFromProviderId(chatDetail?.attendee_provider_id);
  return { name, chatName, phone, snippet };
}

/**
 * `/api/v1/chats` with no `account_id` returns chats sorted by recency ACROSS
 * every connected account, capped at `limit` — so one busy account (e.g.
 * WhatsApp) can fill the whole cap and starve a quieter one (e.g. LinkedIn)
 * out entirely, even though it has real conversations. Fetch each connected
 * account's chats separately so every platform gets its own budget.
 */
async function fetchUnipileChats(apiKey: string, dsn: string): Promise<UnipileChat[]> {
  const accountsData = await unipileGet<{ items?: { id?: string }[] }>('/api/v1/accounts', apiKey, dsn);
  const accountIds = (accountsData?.items ?? []).map((a) => a.id).filter((id): id is string => !!id);

  if (accountIds.length === 0) {
    // Fallback: no account list available, use the old unscoped call rather than returning nothing.
    const data = await unipileGet<{ items?: UnipileChat[] }>('/api/v1/chats?limit=50', apiKey, dsn);
    return data?.items ?? [];
  }

  const perAccount = await Promise.all(
    accountIds.map((id) =>
      unipileGet<{ items?: UnipileChat[] }>(`/api/v1/chats?account_id=${encodeURIComponent(id)}&limit=50`, apiKey, dsn),
    ),
  );
  return perAccount.flatMap((data) => data?.items ?? []);
}

/**
 * Returns the merged conversation list (Unipile + local), optionally filtered by
 * platform. Each item carries a numeric `last_activity_ts` (unix seconds).
 */
export async function getConversations(db: Database.Database, platform = 'all'): Promise<ConversationItem[]> {
  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn = process.env.UNIPILE_DSN;

  const unipileChats = apiKey && dsn ? await fetchUnipileChats(apiKey, dsn) : [];
  const enriched = apiKey && dsn
    ? await Promise.all(unipileChats.map((chat) => fetchChatEnriched(chat, apiKey, dsn)))
    : unipileChats.map(() => ({ name: null, chatName: null, phone: null, snippet: null }));

  const unipileConvos: ConversationItem[] = unipileChats.map((chat, idx) => {
    const channelPlatform = ACCOUNT_TYPE_TO_CHANNEL[chat.account_type ?? ''] ?? 'email';
    const e = enriched[idx];
    // Real name → chat title → phone number → last-resort "Contact N".
    const customerName = e.name || e.chatName || e.phone || `Contact ${idx + 1}`;
    const snippet = e.snippet ?? '—';
    const tsMs = chat.timestamp ? Date.parse(chat.timestamp) : NaN;
    return {
      id: chat.id,
      customer: customerName,
      initials: getInitials(customerName),
      platform: channelPlatform,
      sentiment: 'neutral',
      snippet: snippet.slice(0, 120),
      time_ago: formatTimeAgo(chat.timestamp),
      unread: (chat.unread_count ?? chat.unread ?? 0) > 0 ? 1 : 0,
      location: '',
      language: '',
      intent: '',
      urgency: 5,
      first_contact: chat.timestamp
        ? new Date(chat.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '',
      source: 'unipile',
      last_activity_ts: Number.isFinite(tsMs) ? Math.floor(tsMs / 1000) : Math.floor(Date.now() / 1000),
    };
  });

  /* Non-Unipile channels (Telegram, Discord, etc.) from local DB */
  type DbRow = {
    id: string; customer: string; initials: string; platform: string; sentiment: string;
    snippet: string; time_ago: string; unread: number; location: string | null;
    language: string | null; intent: string | null; urgency: number; first_contact: string | null;
    created_at: number;
  };
  const unipilePlatforms = Array.from(new Set(Object.values(ACCOUNT_TYPE_TO_CHANNEL)));
  const placeholders = unipilePlatforms.map(() => '?').join(',');
  const localRows = db.prepare(
    `SELECT * FROM conversations WHERE platform NOT IN (${placeholders}) ORDER BY created_at DESC`,
  ).all(...unipilePlatforms) as DbRow[];

  const localConvos: ConversationItem[] = localRows.map((r) => ({
    id: r.id,
    customer: r.customer,
    initials: r.initials,
    platform: r.platform,
    sentiment: r.sentiment,
    snippet: r.snippet,
    time_ago: r.time_ago,
    unread: r.unread,
    location: r.location,
    language: r.language,
    intent: r.intent,
    urgency: r.urgency,
    first_contact: r.first_contact,
    last_activity_ts: r.created_at ?? Math.floor(Date.now() / 1000),
  }));

  const all = [...unipileConvos, ...localConvos];
  return platform === 'all' ? all : all.filter((c) => c.platform === platform);
}

/** Convenience wrapper that resolves the singleton db. */
export async function listConversations(platform = 'all'): Promise<ConversationItem[]> {
  return getConversations(getDb(), platform);
}
