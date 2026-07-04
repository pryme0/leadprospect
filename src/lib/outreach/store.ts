/**
 * Per-user outreach tracking for crawler leads.
 *
 * Records which leads a user has messaged (or attempted, assisted) and the
 * status, so the Lead Queue can show "Sent / Replied" and filter by it. Leads
 * live in the shared signals Postgres (read-only from the app), so status is
 * kept locally in SQLite keyed by (user_id, lead_id). Mirrors the comms.db
 * singleton pattern.
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'outreach.db');

export type OutreachStatus = 'not_contacted' | 'sent' | 'replied';
/** How the message left the platform: a real DM (unipile) or assisted (opened + copied). */
export type OutreachChannel = 'unipile' | 'assisted';

export interface OutreachRecord {
  lead_id: string;
  platform: string;
  handle: string | null;
  status: OutreachStatus;
  message: string | null;
  channel: OutreachChannel | null;
  created_at: number;
  updated_at: number;
}

let _db: Database.Database | null = null;

export function getOutreachDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS lead_outreach (
      user_id    TEXT NOT NULL,
      lead_id    TEXT NOT NULL,
      platform   TEXT NOT NULL,
      handle     TEXT,
      status     TEXT NOT NULL DEFAULT 'sent',
      message    TEXT,
      channel    TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, lead_id)
    );
    CREATE INDEX IF NOT EXISTS idx_outreach_user ON lead_outreach(user_id, updated_at DESC);
  `);
  return _db;
}

/** Record (or update) an outreach attempt for a lead. */
export function recordOutreach(
  userId: string,
  input: { leadId: string; platform: string; handle?: string | null; status?: OutreachStatus; message?: string | null; channel?: OutreachChannel | null },
): void {
  const db = getOutreachDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO lead_outreach (user_id, lead_id, platform, handle, status, message, channel, created_at, updated_at)
    VALUES (@user_id, @lead_id, @platform, @handle, @status, @message, @channel, @now, @now)
    ON CONFLICT(user_id, lead_id) DO UPDATE SET
      platform = excluded.platform,
      handle   = COALESCE(excluded.handle, lead_outreach.handle),
      status   = excluded.status,
      message  = COALESCE(excluded.message, lead_outreach.message),
      channel  = COALESCE(excluded.channel, lead_outreach.channel),
      updated_at = excluded.updated_at
  `).run({
    user_id: userId,
    lead_id: input.leadId,
    platform: input.platform,
    handle: input.handle ?? null,
    status: input.status ?? 'sent',
    message: input.message ?? null,
    channel: input.channel ?? null,
    now,
  });
}

/** Status map for a set of lead ids (for rendering the Lead Queue). */
export function getOutreachStatuses(userId: string, leadIds: string[]): Record<string, OutreachRecord> {
  if (leadIds.length === 0) return {};
  const db = getOutreachDb();
  const placeholders = leadIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT lead_id, platform, handle, status, message, channel, created_at, updated_at
       FROM lead_outreach WHERE user_id = ? AND lead_id IN (${placeholders})`,
  ).all(userId, ...leadIds) as OutreachRecord[];
  const out: Record<string, OutreachRecord> = {};
  for (const r of rows) out[r.lead_id] = r;
  return out;
}
