import { appPool, ensureAppSchema } from '@/lib/app-pg';

export interface LeadNote {
  id: string;
  org_id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    const p = appPool();
    await p.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS lead_notes (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id     TEXT NOT NULL,
        lead_id    TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_notes_org_lead ON lead_notes(org_id, lead_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_notes_created ON lead_notes(org_id, created_at DESC)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export async function addNote(orgId: string, leadId: string, userId: string, content: string): Promise<LeadNote> {
  await ensureReady();
  const { rows } = await appPool().query(
    `INSERT INTO lead_notes (org_id, lead_id, user_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [orgId, leadId, userId, content.trim()],
  );
  return rows[0] as LeadNote;
}

export async function getNotesForLead(orgId: string, leadId: string, limit = 50): Promise<LeadNote[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM lead_notes WHERE org_id = $1 AND lead_id = $2 ORDER BY created_at DESC LIMIT $3`,
    [orgId, leadId, limit],
  );
  return rows as LeadNote[];
}

export async function getRecentNotes(orgId: string, limit = 20): Promise<LeadNote[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM lead_notes WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [orgId, limit],
  );
  return rows as LeadNote[];
}

export async function updateNote(orgId: string, noteId: string, content: string): Promise<LeadNote | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `UPDATE lead_notes SET content = $3, updated_at = now()
     WHERE org_id = $1 AND id = $2
     RETURNING *`,
    [orgId, noteId, content.trim()],
  );
  return (rows[0] as LeadNote) ?? null;
}

export async function deleteNote(orgId: string, noteId: string): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await appPool().query(
    `DELETE FROM lead_notes WHERE org_id = $1 AND id = $2`,
    [orgId, noteId],
  );
  return (rowCount ?? 0) > 0;
}
