/**
 * Mention ingestion: run every configured provider for a user's brand query,
 * dedupe, AI relevance+sentiment, and persist per-user. Throttled by a watermark
 * in comms_meta so it's safe to call on every page load.
 */
import { createHash } from 'crypto';
import { getDb, upsertMention, getMeta, setMeta, MENTION_WINDOW_DAYS } from '@/lib/comms/db';
import { getOrgProfile, hasBrandTerms } from '@/lib/settings/org-store';
import { classifyMentions } from './classify';
import type { MentionProvider, BrandQuery, RawMention } from './providers/types';
import { hackernews } from './providers/hackernews';
import { reddit } from './providers/reddit';
import { youtube } from './providers/youtube';
import { web } from './providers/web';
import { aggregator } from './providers/aggregator';

const ALL_PROVIDERS: MentionProvider[] = [hackernews, reddit, youtube, web, aggregator];
const LOOKBACK_DAYS = 14;        // how far back providers search
const COOLDOWN_SEC = 10 * 60;    // min seconds between refreshes per user

export function configuredProviders(): string[] {
  return ALL_PROVIDERS.filter((p) => p.isConfigured()).map((p) => p.name);
}

function contentHash(url: string, text: string): string {
  let basis = text;
  if (url) {
    try { const u = new URL(url); basis = `${u.hostname.replace(/^www\./, '')}${u.pathname}`.toLowerCase(); }
    catch { basis = url.toLowerCase(); }
  }
  return createHash('sha256').update(basis).digest('hex').slice(0, 32);
}

function initialsOf(author: string): string {
  return author.replace(/^[@r/]+/, '').split(/[\s._-]+/).map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2) || 'M';
}

/** Decode common HTML entities (providers like HN return escaped text). */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&#x2F;|&#47;/gi, '/')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ');
}

function buildQuery(profile: NonNullable<Awaited<ReturnType<typeof getOrgProfile>>>): BrandQuery {
  return {
    companyName: profile.company_name,
    keywords: profile.brand_keywords,
    handles: profile.brand_handles,
    exclude: profile.exclude_terms,
    summary: profile.analysis?.summary,
  };
}

export interface IngestResult {
  ran: boolean;
  reason?: 'no_terms' | 'cooldown';
  providers: string[];
  scanned: number;
  inserted: number;
}

/**
 * Ingest mentions for a user. Returns { ran:false, reason:'cooldown' } if called
 * within COOLDOWN. Pass force=true to bypass the throttle (manual "Refresh").
 */
export async function ingestForUser(userId: string, force = false): Promise<IngestResult> {
  const db = getDb();
  const profile = await getOrgProfile(userId);
  if (!hasBrandTerms(profile)) return { ran: false, reason: 'no_terms', providers: [], scanned: 0, inserted: 0 };

  const metaKey = `mentions_fetch:${userId}`;
  const last = Number(getMeta(db, metaKey) ?? 0);
  const now = Math.floor(Date.now() / 1000);
  if (!force && now - last < COOLDOWN_SEC) {
    return { ran: false, reason: 'cooldown', providers: configuredProviders(), scanned: 0, inserted: 0 };
  }

  const query = buildQuery(profile!);
  const sinceIso = new Date((now - LOOKBACK_DAYS * 86400) * 1000).toISOString();
  const providers = ALL_PROVIDERS.filter((p) => p.isConfigured());

  const settled = await Promise.allSettled(providers.map((p) => p.search(query, sinceIso)));
  const raw: RawMention[] = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));

  // Dedupe within this batch by hash, and drop anything already stored.
  const windowFloor = now - MENTION_WINDOW_DAYS * 86400;
  const byHash = new Map<string, RawMention>();
  for (const m of raw) {
    if (m.ts < windowFloor) continue;
    const h = contentHash(m.url, m.text);
    if (!byHash.has(h)) byHash.set(h, m);
  }
  const hashes = Array.from(byHash.keys());
  const scanned = hashes.length;
  if (scanned === 0) {
    setMeta(db, metaKey, String(now));
    return { ran: true, providers: providers.map((p) => p.name), scanned: 0, inserted: 0 };
  }

  const existing = new Set(
    (db.prepare(
      `SELECT content_hash FROM mentions WHERE user_id = ? AND content_hash IN (${hashes.map(() => '?').join(',')})`,
    ).all(userId, ...hashes) as { content_hash: string }[]).map((r) => r.content_hash),
  );
  const fresh = Array.from(byHash.entries()).filter(([h]) => !existing.has(h));

  // AI relevance + sentiment on the fresh candidates only.
  const verdicts = await classifyMentions(query.companyName, query.summary ?? '', fresh.map(([, m]) => m.text));

  let inserted = 0;
  fresh.forEach(([hash, m], i) => {
    const v = verdicts[i] ?? { relevant: true, sentiment: 'neutral' as const };
    if (!v.relevant) return;
    const ok = upsertMention(db, userId, {
      platform: m.platform,
      author: decodeEntities(m.author),
      handle: m.handle,
      initials: initialsOf(m.author),
      text: decodeEntities(m.text),
      url: m.url,
      sentiment: v.sentiment,
      context: m.provider,
      provider: m.provider,
      content_hash: hash,
      detected_at: m.ts,
    });
    if (ok) inserted += 1;
  });

  setMeta(db, metaKey, String(now));
  return { ran: true, providers: providers.map((p) => p.name), scanned, inserted };
}
