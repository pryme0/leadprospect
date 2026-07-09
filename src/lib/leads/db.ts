/**
 * Lead engine store — real leads captured from the site (homepage prompt /
 * capture forms), now on the SHARED Postgres so captures are consistent across
 * environments. There is intentionally NO seed/demo data: every row is a real
 * capture.
 *
 * `getLeadsDb()` returns the shared pool; the read/write helpers are async.
 */
import type { Pool } from 'pg';
import { randomBytes } from 'crypto';
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { migrateSqliteTable } from '@/lib/pg-migrate';

const LEAD_COLUMNS = [
  'id', 'first_name', 'email', 'phone_number', 'timeline_to_start', 'income_goal',
  'source_tool', 'intent_level', 'consent_call', 'consent_email', 'consented',
  'ghl_contact_id', 'lead_source', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'referrer', 'landing_path', 'created_at',
] as const;

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    const p = appPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id                TEXT PRIMARY KEY,
        first_name        TEXT NOT NULL DEFAULT '',
        email             TEXT NOT NULL,
        phone_number      TEXT NOT NULL DEFAULT '',
        timeline_to_start TEXT NOT NULL DEFAULT '',
        income_goal       TEXT NOT NULL DEFAULT '',
        source_tool       TEXT NOT NULL DEFAULT '',
        intent_level      TEXT NOT NULL DEFAULT 'MEDIUM_INTENT',
        consent_call      INTEGER NOT NULL DEFAULT 0,
        consent_email     INTEGER NOT NULL DEFAULT 0,
        consented         INTEGER NOT NULL DEFAULT 0,
        ghl_contact_id    TEXT,
        lead_source       TEXT,
        utm_source        TEXT,
        utm_medium        TEXT,
        utm_campaign      TEXT,
        utm_term          TEXT,
        utm_content       TEXT,
        referrer          TEXT,
        landing_path      TEXT,
        created_at        TEXT NOT NULL
      );
    `);
    await p.query('CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at)');
    await p.query('CREATE INDEX IF NOT EXISTS idx_leads_source_tool ON leads(source_tool)');
    await p.query('CREATE INDEX IF NOT EXISTS idx_leads_intent_level ON leads(intent_level)');
    await migrateSqliteTable({ file: 'leads.db', table: 'leads', columns: LEAD_COLUMNS as unknown as string[], conflict: 'ON CONFLICT (id) DO NOTHING' });
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

/** Returns the shared Postgres pool (kept for call-site parity with the old API). */
export function getLeadsDb(): Pool {
  return appPool();
}

type IntentLevel = 'HIGH_INTENT' | 'MEDIUM_INTENT' | 'LOW_INTENT';

export interface LeadRow {
  id: string;
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start: string;
  income_goal: string;
  source_tool: string;
  intent_level: IntentLevel;
  consented: boolean;
  ghl_contact_id: string | null;
  lead_source: string | null;
  created_at: string;
}

export interface LeadInsert {
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start?: string;
  income_goal?: string;
  source_tool: string;
  intent_level: IntentLevel;
  consent_call: boolean;
  consent_email: boolean;
  consented: boolean;
  lead_source: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
}

export interface LeadQuery {
  page?: number;
  limit?: number;
  source_tool?: string;
  intent_level?: string;
}

/* ── Writes ──────────────────────────────────────────────────────────────────── */

/** Insert a captured lead. Returns the generated id. */
export async function insertLead(_db: Pool, data: LeadInsert): Promise<string> {
  await ensureReady();
  const id = `lead_${randomBytes(9).toString('hex')}`;
  await appPool().query(
    `INSERT INTO leads (
       id, first_name, email, phone_number, timeline_to_start, income_goal,
       source_tool, intent_level, consent_call, consent_email, consented,
       ghl_contact_id, lead_source,
       utm_source, utm_medium, utm_campaign, utm_term, utm_content,
       referrer, landing_path, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      id, data.first_name, data.email, data.phone_number, data.timeline_to_start ?? '', data.income_goal ?? '',
      data.source_tool, data.intent_level, data.consent_call ? 1 : 0, data.consent_email ? 1 : 0, data.consented ? 1 : 0,
      data.lead_source,
      data.utm_source ?? null, data.utm_medium ?? null, data.utm_campaign ?? null, data.utm_term ?? null, data.utm_content ?? null,
      data.referrer ?? null, data.landing_path ?? null, new Date().toISOString(),
    ],
  );
  return id;
}

/** Attach a CRM contact id to a lead (used once real CRM sync succeeds). */
export async function markLeadSynced(_db: Pool, id: string, ghlContactId: string): Promise<boolean> {
  await ensureReady();
  const r = await appPool().query('UPDATE leads SET ghl_contact_id = $1 WHERE id = $2', [ghlContactId, id]);
  return (r.rowCount ?? 0) > 0;
}

/* ── Reads ───────────────────────────────────────────────────────────────────── */

export interface LeadPage {
  leads: LeadRow[];
  total: number;
  total_pages: number;
}

/** Paginated, filterable list of captured leads, newest first. */
export async function listLeads(_db: Pool, q: LeadQuery = {}): Promise<LeadPage> {
  await ensureReady();
  const page = Math.max(1, Number(q.page ?? 1));
  const limit = Math.max(1, Number(q.limit ?? 20));

  const where: string[] = [];
  const params: unknown[] = [];
  if (q.source_tool)  { params.push(q.source_tool);  where.push(`source_tool = $${params.length}`); }
  if (q.intent_level) { params.push(q.intent_level); where.push(`intent_level = $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRes = await appPool().query(`SELECT COUNT(*)::int AS c FROM leads ${whereSql}`, params);
  const total = (totalRes.rows[0]?.c as number) ?? 0;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;

  const listParams = [...params, limit, offset];
  const rows = (await appPool().query(
    `SELECT id, first_name, email, phone_number, timeline_to_start, income_goal,
            source_tool, intent_level, consented, ghl_contact_id, lead_source, created_at
     FROM leads ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams,
  )).rows as (Omit<LeadRow, 'consented'> & { consented: number })[];

  return {
    leads: rows.map((r) => ({ ...r, consented: !!r.consented })),
    total,
    total_pages,
  };
}

/** Leads with no CRM contact id yet. */
export async function listUnsynced(_db: Pool): Promise<{ id: string }[]> {
  await ensureReady();
  const r = await appPool().query('SELECT id FROM leads WHERE ghl_contact_id IS NULL');
  return r.rows as { id: string }[];
}
