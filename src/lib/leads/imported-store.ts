import { appPool, ensureAppSchema } from '@/lib/app-pg';

export interface ImportedLeadRow {
  id: string;
  org_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    await appPool().query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await appPool().query(`
      CREATE TABLE IF NOT EXISTS imported_leads (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id     TEXT NOT NULL,
        name       TEXT,
        email      TEXT,
        phone      TEXT,
        company    TEXT,
        source     TEXT DEFAULT 'import',
        notes      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await appPool().query(`CREATE INDEX IF NOT EXISTS ix_imported_leads_org ON imported_leads(org_id)`);
    await appPool().query(`CREATE INDEX IF NOT EXISTS ix_imported_leads_email ON imported_leads(org_id, email)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export async function importedLeadEmailExists(orgId: string, email: string): Promise<boolean> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT 1 FROM imported_leads WHERE org_id = $1 AND email = $2 LIMIT 1`,
    [orgId, email],
  );
  return rows.length > 0;
}

export async function insertImportedLead(orgId: string, lead: { name?: string; email?: string; phone?: string; company?: string; source?: string; notes?: string }): Promise<void> {
  await ensureReady();
  await appPool().query(
    `INSERT INTO imported_leads (org_id, name, email, phone, company, source, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [orgId, lead.name ?? null, lead.email ?? null, lead.phone ?? null, lead.company ?? null, lead.source ?? 'import', lead.notes ?? null],
  );
}

export async function listImportedLeads(orgId: string): Promise<ImportedLeadRow[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM imported_leads WHERE org_id = $1 ORDER BY created_at DESC LIMIT 500`,
    [orgId],
  );
  return rows as ImportedLeadRow[];
}
