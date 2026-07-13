/**
 * Per-user outreach tracking for crawler leads — now on the SHARED Postgres
 * (`lead_outreach`), keyed by (user_id, lead_id), so "Sent / Replied" status is
 * consistent across environments. Leads themselves live in the crawler signals
 * Postgres (read-only from the app); this table just records status.
 */
import type { Pool } from 'pg';
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { migrateSqliteTable } from '@/lib/pg-migrate';
import { advancePastNew } from '@/lib/pipeline/store';

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

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    const p = appPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS lead_outreach (
        user_id    TEXT NOT NULL,
        lead_id    TEXT NOT NULL,
        platform   TEXT NOT NULL,
        handle     TEXT,
        status     TEXT NOT NULL DEFAULT 'sent',
        message    TEXT,
        channel    TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, lead_id)
      );
    `);
    await p.query('CREATE INDEX IF NOT EXISTS idx_outreach_user ON lead_outreach(user_id, updated_at DESC)');
    await migrateSqliteTable({
      file: 'outreach.db', table: 'lead_outreach',
      columns: ['user_id', 'lead_id', 'platform', 'handle', 'status', 'message', 'channel', 'created_at', 'updated_at'],
      conflict: 'ON CONFLICT (user_id, lead_id) DO NOTHING',
    });
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

/** Returns the shared Postgres pool (kept for call-site parity). */
export function getOutreachDb(): Pool {
  return appPool();
}

/** Record (or update) an outreach attempt for a lead. */
export async function recordOutreach(
  userId: string,
  input: { leadId: string; platform: string; handle?: string | null; status?: OutreachStatus; message?: string | null; channel?: OutreachChannel | null },
): Promise<void> {
  await ensureReady();
  const now = Math.floor(Date.now() / 1000);
  await appPool().query(
    `INSERT INTO lead_outreach (user_id, lead_id, platform, handle, status, message, channel, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
     ON CONFLICT (user_id, lead_id) DO UPDATE SET
       platform = EXCLUDED.platform,
       handle   = COALESCE(EXCLUDED.handle, lead_outreach.handle),
       status   = EXCLUDED.status,
       message  = COALESCE(EXCLUDED.message, lead_outreach.message),
       channel  = COALESCE(EXCLUDED.channel, lead_outreach.channel),
       updated_at = EXCLUDED.updated_at`,
    [userId, input.leadId, input.platform, input.handle ?? null, input.status ?? 'sent', input.message ?? null, input.channel ?? null, now],
  );

  // Auto-advance the pipeline: New → Contacted on the lead's first outreach.
  // Forward-only (never regresses qualified/won/lost) — see advancePastNew.
  if ((input.status ?? 'sent') === 'sent') {
    await advancePastNew(userId, input.leadId).catch(() => { /* best-effort */ });
  }
}

/** Status map for a set of lead ids (for rendering the Lead Queue). */
export async function getOutreachStatuses(userId: string, leadIds: string[]): Promise<Record<string, OutreachRecord>> {
  if (leadIds.length === 0) return {};
  await ensureReady();
  const rows = (await appPool().query(
    `SELECT lead_id, platform, handle, status, message, channel, created_at, updated_at
       FROM lead_outreach WHERE user_id = $1 AND lead_id = ANY($2)`,
    [userId, leadIds],
  )).rows as (Omit<OutreachRecord, 'created_at' | 'updated_at'> & { created_at: string | number; updated_at: string | number })[];
  const out: Record<string, OutreachRecord> = {};
  for (const r of rows) out[r.lead_id] = { ...r, created_at: Number(r.created_at), updated_at: Number(r.updated_at) };
  return out;
}
