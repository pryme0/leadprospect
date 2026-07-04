/**
 * Singleton SQLite connection for the Lead engine.
 * Persists real leads captured from the site (homepage prompt / capture forms).
 * better-sqlite3 is synchronous — safe to call from Next.js Route Handlers.
 *
 * There is intentionally NO seed/demo data here: every row is a real capture.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { randomBytes } from 'crypto';

const DB_PATH = path.join(process.cwd(), 'leads.db');

let _db: Database.Database | null = null;

export function getLeadsDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  bootstrap(_db);
  return _db;
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

/* ── Schema ──────────────────────────────────────────────────────────────────── */

function bootstrap(db: Database.Database) {
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_leads_created_at   ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_leads_source_tool  ON leads(source_tool);
    CREATE INDEX IF NOT EXISTS idx_leads_intent_level ON leads(intent_level);
  `);
}

/* ── Types ───────────────────────────────────────────────────────────────────── */

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
export function insertLead(db: Database.Database, data: LeadInsert): string {
  const id = `lead_${cryptoRandomId()}`;
  db.prepare(`
    INSERT INTO leads (
      id, first_name, email, phone_number, timeline_to_start, income_goal,
      source_tool, intent_level, consent_call, consent_email, consented,
      ghl_contact_id, lead_source,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      referrer, landing_path, created_at
    ) VALUES (
      @id, @first_name, @email, @phone_number, @timeline_to_start, @income_goal,
      @source_tool, @intent_level, @consent_call, @consent_email, @consented,
      NULL, @lead_source,
      @utm_source, @utm_medium, @utm_campaign, @utm_term, @utm_content,
      @referrer, @landing_path, @created_at
    )
  `).run({
    id,
    first_name: data.first_name,
    email: data.email,
    phone_number: data.phone_number,
    timeline_to_start: data.timeline_to_start ?? '',
    income_goal: data.income_goal ?? '',
    source_tool: data.source_tool,
    intent_level: data.intent_level,
    consent_call: data.consent_call ? 1 : 0,
    consent_email: data.consent_email ? 1 : 0,
    consented: data.consented ? 1 : 0,
    lead_source: data.lead_source,
    utm_source: data.utm_source ?? null,
    utm_medium: data.utm_medium ?? null,
    utm_campaign: data.utm_campaign ?? null,
    utm_term: data.utm_term ?? null,
    utm_content: data.utm_content ?? null,
    referrer: data.referrer ?? null,
    landing_path: data.landing_path ?? null,
    created_at: new Date().toISOString(),
  });
  return id;
}

/** Attach a CRM contact id to a lead (used once real CRM sync succeeds). */
export function markLeadSynced(db: Database.Database, id: string, ghlContactId: string): boolean {
  const res = db.prepare('UPDATE leads SET ghl_contact_id = ? WHERE id = ?').run(ghlContactId, id);
  return res.changes > 0;
}

/* ── Reads ───────────────────────────────────────────────────────────────────── */

export interface LeadPage {
  leads: LeadRow[];
  total: number;
  total_pages: number;
}

/** Paginated, filterable list of captured leads, newest first. */
export function listLeads(db: Database.Database, q: LeadQuery = {}): LeadPage {
  const page = Math.max(1, Number(q.page ?? 1));
  const limit = Math.max(1, Number(q.limit ?? 20));

  const where: string[] = [];
  const params: Record<string, string> = {};
  if (q.source_tool) { where.push('source_tool = @source_tool'); params.source_tool = q.source_tool; }
  if (q.intent_level) { where.push('intent_level = @intent_level'); params.intent_level = q.intent_level; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as c FROM leads ${whereSql}`).get(params) as { c: number }).c;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT id, first_name, email, phone_number, timeline_to_start, income_goal,
           source_tool, intent_level, consented, ghl_contact_id, lead_source, created_at
    FROM leads
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset }) as (Omit<LeadRow, 'consented'> & { consented: number })[];

  return {
    leads: rows.map((r) => ({ ...r, consented: !!r.consented })),
    total,
    total_pages,
  };
}

/** Leads with no CRM contact id yet. */
export function listUnsynced(db: Database.Database): { id: string }[] {
  return db.prepare('SELECT id FROM leads WHERE ghl_contact_id IS NULL').all() as { id: string }[];
}

/* ── utils ───────────────────────────────────────────────────────────────────── */

function cryptoRandomId(): string {
  return randomBytes(9).toString('hex');
}
