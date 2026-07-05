/**
 * Singleton SQLite connection for the Comm Hub ("Pulse") backend.
 * better-sqlite3 is synchronous — safe to call from Next.js Route Handlers.
 *
 * Mentions are REAL and PER-USER: ingested from external providers (see
 * src/lib/mentions/*) and scoped to the authenticated user's company. There is
 * no demo seed data. All mention reads use one canonical window (rolling
 * MENTION_WINDOW_DAYS, local time) so the list, KPI, badge and chart reconcile.
 */
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import { sqliteFile } from '@/lib/sqlite-path';

const DB_PATH = sqliteFile('comms.db');

/** Canonical mention window shared by the list, count, badge and chart. */
export const MENTION_WINDOW_DAYS = 30;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  bootstrap(_db);
  return _db;
}

/* ── Schema ──────────────────────────────────────────────────────────────────── */

function bootstrap(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id           TEXT PRIMARY KEY,
      customer     TEXT NOT NULL,
      initials     TEXT NOT NULL,
      platform     TEXT NOT NULL,
      sentiment    TEXT NOT NULL,
      snippet      TEXT NOT NULL,
      time_ago     TEXT NOT NULL,
      unread       INTEGER DEFAULT 1,
      location     TEXT,
      language     TEXT,
      intent       TEXT,
      urgency      INTEGER DEFAULT 5,
      first_contact TEXT,
      created_at   INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      from_type       TEXT NOT NULL,
      text            TEXT NOT NULL,
      time            TEXT NOT NULL,
      created_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS ai_replies (
      conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
      text            TEXT NOT NULL,
      updated_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      date            TEXT NOT NULL,
      channel         TEXT NOT NULL,
      event           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connected_channels (
      channel_id    TEXT PRIMARY KEY,
      handle        TEXT NOT NULL,
      connected_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sent_replies (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      text            TEXT NOT NULL,
      tone            TEXT NOT NULL DEFAULT 'professional',
      kb_enabled      INTEGER DEFAULT 1,
      sent_at         INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS comms_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mentions (
      id             TEXT PRIMARY KEY,
      user_id        TEXT,
      platform       TEXT NOT NULL,
      author         TEXT NOT NULL,
      handle         TEXT NOT NULL,
      initials       TEXT NOT NULL,
      text           TEXT NOT NULL,
      url            TEXT,
      time           TEXT,
      sentiment      TEXT NOT NULL DEFAULT 'neutral',
      context        TEXT,
      provider       TEXT,
      content_hash   TEXT,
      detected_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      seen           INTEGER NOT NULL DEFAULT 0,
      replied        INTEGER NOT NULL DEFAULT 0,
      created_at     INTEGER DEFAULT (unixepoch())
    );
  `);

  migrateMentions(db);
  migrateConnectedChannels(db);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mentions_user_hash ON mentions(user_id, content_hash);
    CREATE INDEX IF NOT EXISTS idx_mentions_user_detected  ON mentions(user_id, detected_at DESC);
  `);
}

/**
 * connected_channels used to be global (PRIMARY KEY channel_id, shared by every
 * user) — a real multi-tenancy bug independent of subscription tiers, that the
 * new "N connected accounts" tier cap requires fixing first. Adds a nullable
 * user_id column (the original PK can't be changed in place without a table
 * rebuild; a UNIQUE(user_id, channel_id) index is sufficient for this
 * single-tenant-today environment) and backfills existing rows to the one real
 * demo user so nothing is silently orphaned.
 */
function migrateConnectedChannels(db: Database.Database) {
  const cols = new Set((db.prepare('PRAGMA table_info(connected_channels)').all() as { name: string }[]).map((c) => c.name));
  if (!cols.has('user_id')) {
    db.exec(`ALTER TABLE connected_channels ADD COLUMN user_id TEXT`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_channels_user_channel ON connected_channels(user_id, channel_id)`);
    const legacy = db.prepare("SELECT COUNT(*) as c FROM connected_channels WHERE user_id IS NULL").get() as { c: number };
    if (legacy.c > 0) {
      db.exec(`UPDATE connected_channels SET user_id = 'usr_admin_001' WHERE user_id IS NULL`);
    }
  }
}

/** Add per-user columns to a pre-existing mentions table and drop legacy global seeds. */
function migrateMentions(db: Database.Database) {
  const cols = new Set((db.prepare('PRAGMA table_info(mentions)').all() as { name: string }[]).map((c) => c.name));
  const add = (name: string, decl: string) => {
    if (!cols.has(name)) db.exec(`ALTER TABLE mentions ADD COLUMN ${name} ${decl}`);
  };
  add('user_id', 'TEXT');
  add('provider', 'TEXT');
  add('content_hash', 'TEXT');
  add('seen', 'INTEGER NOT NULL DEFAULT 0');
  add('detected_at', 'INTEGER');
  // One-time cleanup: the old global demo seeds (m1..m4) had no user_id.
  db.exec('DELETE FROM mentions WHERE user_id IS NULL');
}

/* ── comms_meta key/value (per-user watermarks etc.) ─────────────────────────── */

export function getMeta(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM comms_meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(db: Database.Database, key: string, value: string): void {
  db.prepare('INSERT INTO comms_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}

/* ── Mentions (real, per-user) ───────────────────────────────────────────────── */

function nowSec(): number { return Math.floor(Date.now() / 1000); }
function windowStart(days = MENTION_WINDOW_DAYS): number { return nowSec() - days * 86400; }

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface MentionRecord {
  id: string;
  user_id: string;
  platform: string;
  author: string;
  handle: string;
  initials: string;
  text: string;
  url: string;
  time: string;
  sentiment: string;
  context: string;
  provider: string | null;
  replied: number;
  seen: number;
  detected_at: number;
}

export interface MentionInsert {
  platform: string;
  author: string;
  handle: string;
  initials: string;
  text: string;
  url: string;
  sentiment: string;
  context: string;
  provider: string;
  content_hash: string;
  detected_at: number;
}

export interface MentionFilter {
  platform?: string;                 // 'all' or a platform id
  sentiment?: string;                // 'all' | positive | neutral | negative
  status?: 'all' | 'replied' | 'unreplied' | 'unseen';
  q?: string;
}

function buildMentionWhere(userId: string, f: MentionFilter = {}): { sql: string; params: unknown[] } {
  const clauses = ['user_id = ?', 'detected_at >= ?'];
  const params: unknown[] = [userId, windowStart()];
  if (f.platform && f.platform !== 'all') { clauses.push('platform = ?'); params.push(f.platform); }
  if (f.sentiment && f.sentiment !== 'all') { clauses.push('sentiment = ?'); params.push(f.sentiment); }
  if (f.status === 'replied') clauses.push('replied = 1');
  else if (f.status === 'unreplied') clauses.push('replied = 0');
  else if (f.status === 'unseen') clauses.push('seen = 0');
  if (f.q && f.q.trim()) {
    const term = `%${f.q.trim()}%`;
    clauses.push('(text LIKE ? OR author LIKE ? OR handle LIKE ?)');
    params.push(term, term, term);
  }
  return { sql: `WHERE ${clauses.join(' AND ')}`, params };
}

/** A user's mentions within the canonical window, newest first. */
export function listMentions(db: Database.Database, userId: string, f: MentionFilter = {}, limit = 200): MentionRecord[] {
  const { sql, params } = buildMentionWhere(userId, f);
  const rows = db.prepare(`
    SELECT id, user_id, platform, author, handle, initials, text, url, sentiment, context,
           provider, replied, seen, detected_at
    FROM mentions ${sql}
    ORDER BY detected_at DESC
    LIMIT ?
  `).all(...params, limit) as Omit<MentionRecord, 'time'>[];
  return rows.map((r) => ({ ...r, time: relTime(r.detected_at) }));
}

export function countMentions(db: Database.Database, userId: string, f: MentionFilter = {}): number {
  const { sql, params } = buildMentionWhere(userId, f);
  const row = db.prepare(`SELECT COUNT(*) as c FROM mentions ${sql}`).get(...params) as { c: number };
  return row.c;
}

/** Mentions detected in the last 24h — used for the Basic-tier daily mentions cap.
 * Independent of the canonical 30-day MENTION_WINDOW_DAYS used everywhere else
 * (KPIs/chart), so capping display never distorts the real historical count. */
export function countMentionsToday(db: Database.Database, userId: string): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM mentions WHERE user_id = ? AND detected_at >= ?')
    .get(userId, windowStart(1)) as { c: number };
  return row.c;
}

/** Insert a freshly-ingested mention; ignores duplicates (user_id + content_hash). Returns true if inserted. */
export function upsertMention(db: Database.Database, userId: string, m: MentionInsert): boolean {
  const res = db.prepare(`
    INSERT INTO mentions (id, user_id, platform, author, handle, initials, text, url, time,
                          sentiment, context, provider, content_hash, detected_at, seen, replied)
    VALUES (@id, @user_id, @platform, @author, @handle, @initials, @text, @url, '',
            @sentiment, @context, @provider, @content_hash, @detected_at, 0, 0)
    ON CONFLICT(user_id, content_hash) DO NOTHING
  `).run({ id: `mnt_${randomBytes(10).toString('hex')}`, user_id: userId, ...m });
  return res.changes > 0;
}

/** Mark a user's mentions as seen (all in-window, or a specific id). */
export function markMentionsSeen(db: Database.Database, userId: string, id?: string): number {
  const res = id
    ? db.prepare('UPDATE mentions SET seen = 1 WHERE user_id = ? AND id = ?').run(userId, id)
    : db.prepare('UPDATE mentions SET seen = 1 WHERE user_id = ? AND seen = 0').run(userId);
  return res.changes;
}

export function markMentionReplied(db: Database.Database, userId: string, id: string): boolean {
  const res = db.prepare('UPDATE mentions SET replied = 1, seen = 1 WHERE user_id = ? AND id = ?').run(userId, id);
  return res.changes > 0;
}

/* ── Recent activity feed + comms chart (derived from real events) ───────────── */

const PLATFORM_COLOR: Record<string, string> = {
  linkedin: '#0A66C2', x: '#e4e4e4', twitter: '#e4e4e4', whatsapp: '#25D366', email: '#6D5EF9',
  gmail: '#EA4335', instagram: '#E1306C', facebook: '#1877F2', tiktok: '#69C9D0',
  reddit: '#FF4500', youtube: '#FF0000', hackernews: '#FF6600', news: '#9CA3AF', web: '#9CA3AF',
};
export const platformColor = (p: string) => PLATFORM_COLOR[p] ?? '#6D5EF9';
export const platformLabel = (p: string) =>
  p === 'x' ? 'X' : p === 'hackernews' ? 'Hacker News' : p.charAt(0).toUpperCase() + p.slice(1);

function relTime(unixSec: number): string {
  const diff = nowSec() - unixSec;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Local Y-M-D key for a unix timestamp (matches the chart's local buckets). */
function localDayKey(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface ActivityEvent { id: string; event: string; time: string; color: string; ts: number }

/**
 * Recent real events for a user: brand mentions detected (per-user, same source
 * as the Mentions tab) + replies sent + channels connected — within the window.
 */
export function listRecentActivity(db: Database.Database, userId: string, limit = 10): ActivityEvent[] {
  const start = windowStart();
  const events: ActivityEvent[] = [];

  for (const m of listMentions(db, userId, {}, limit)) {
    events.push({
      id: `mention-${m.id}`,
      event: `New mention on ${platformLabel(m.platform)} · ${m.author}`,
      time: relTime(m.detected_at), color: platformColor(m.platform), ts: m.detected_at,
    });
  }

  const replies = db.prepare(`
    SELECT sr.id, sr.conversation_id, sr.sent_at, c.customer, c.platform
    FROM sent_replies sr
    LEFT JOIN conversations c ON c.id = sr.conversation_id
    WHERE sr.sent_at >= ?
    ORDER BY sr.sent_at DESC LIMIT ?
  `).all(start, limit) as { id: number; conversation_id: string; sent_at: number; customer: string | null; platform: string | null }[];
  for (const r of replies) {
    const isMention = String(r.conversation_id).startsWith('mention:');
    const who = r.customer ?? (isMention ? 'a brand mention' : 'a contact');
    events.push({
      id: `reply-${r.id}`,
      event: `Reply sent to ${who}${r.platform ? ` on ${platformLabel(r.platform)}` : ''}`,
      time: relTime(r.sent_at), color: '#21F2A6', ts: r.sent_at,
    });
  }

  const chans = db.prepare('SELECT channel_id, handle, connected_at FROM connected_channels WHERE user_id = ?').all(userId) as { channel_id: string; handle: string; connected_at: string }[];
  for (const ch of chans) {
    const parsed = Math.floor(new Date(ch.connected_at).getTime() / 1000);
    const ts = Number.isFinite(parsed) && parsed > 0 ? parsed : nowSec();
    if (ts < start) continue;
    events.push({
      id: `chan-${ch.channel_id}`,
      event: `Channel connected · ${ch.handle}`,
      time: relTime(ts), color: platformColor(ch.channel_id), ts,
    });
  }

  return events.sort((a, b) => b.ts - a.ts).slice(0, limit);
}

export interface ActivityDay { day: string; received: number; sent: number; mentions: number }

/**
 * Real messages-in / replies-out / mentions bucketed over the last 7 days.
 * Mentions are per-user and bucketed by LOCAL day — consistent with the KPI and
 * list windows (so the green bars reconcile with "Mentions Detected").
 */
export function commsActivitySeries(db: Database.Database, userId: string): ActivityDay[] {
  const now = new Date();
  const buckets: (ActivityDay & { key: string })[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    buckets.push({
      key: localDayKey(Math.floor(d.getTime() / 1000)),
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      received: 0, sent: 0, mentions: 0,
    });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  const weekStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime() / 1000);

  (db.prepare('SELECT sent_at FROM sent_replies WHERE sent_at >= ?').all(weekStart) as { sent_at: number }[])
    .forEach((r) => { const b = byKey[localDayKey(r.sent_at)]; if (b) b.sent++; });
  (db.prepare("SELECT created_at FROM messages WHERE from_type = 'customer' AND created_at >= ?").all(weekStart) as { created_at: number }[])
    .forEach((m) => { const b = byKey[localDayKey(m.created_at)]; if (b) b.received++; });
  (db.prepare('SELECT detected_at FROM mentions WHERE user_id = ? AND detected_at >= ?').all(userId, weekStart) as { detected_at: number }[])
    .forEach((m) => { const b = byKey[localDayKey(m.detected_at)]; if (b) b.mentions++; });

  return buckets.map(({ day, received, sent, mentions }) => ({ day, received, sent, mentions }));
}
