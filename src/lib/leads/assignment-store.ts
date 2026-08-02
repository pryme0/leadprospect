import { appPool, ensureAppSchema } from '@/lib/app-pg';

export interface LeadAssignment {
  id: string;
  org_id: string;
  lead_id: string;
  user_id: string;
  assigned_by: string;
  created_at: string;
}

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    const p = appPool();
    await p.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS lead_assignments (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id      TEXT NOT NULL,
        lead_id     TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_lead_assignments_org_lead ON lead_assignments(org_id, lead_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_assignments_user ON lead_assignments(org_id, user_id)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export async function assignLead(orgId: string, leadId: string, userId: string, assignedBy: string): Promise<LeadAssignment> {
  await ensureReady();
  const { rows } = await appPool().query(
    `INSERT INTO lead_assignments (org_id, lead_id, user_id, assigned_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (org_id, lead_id) DO UPDATE SET user_id = $3, assigned_by = $4, created_at = now()
     RETURNING *`,
    [orgId, leadId, userId, assignedBy],
  );
  return rows[0] as LeadAssignment;
}

export async function unassignLead(orgId: string, leadId: string): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await appPool().query(
    `DELETE FROM lead_assignments WHERE org_id = $1 AND lead_id = $2`,
    [orgId, leadId],
  );
  return (rowCount ?? 0) > 0;
}

export async function getAssignment(orgId: string, leadId: string): Promise<LeadAssignment | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM lead_assignments WHERE org_id = $1 AND lead_id = $2`,
    [orgId, leadId],
  );
  return (rows[0] as LeadAssignment) ?? null;
}

export async function getAssignmentsForLeads(orgId: string, leadIds: string[]): Promise<Record<string, LeadAssignment>> {
  if (leadIds.length === 0) return {};
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM lead_assignments WHERE org_id = $1 AND lead_id = ANY($2)`,
    [orgId, leadIds],
  );
  const out: Record<string, LeadAssignment> = {};
  for (const r of rows as LeadAssignment[]) {
    out[r.lead_id] = r;
  }
  return out;
}

export async function getLeadsAssignedToUser(orgId: string, userId: string): Promise<string[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT lead_id FROM lead_assignments WHERE org_id = $1 AND user_id = $2`,
    [orgId, userId],
  );
  return rows.map((r: { lead_id: string }) => r.lead_id);
}

export async function getAssignmentStats(orgId: string): Promise<{ user_id: string; count: number }[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT user_id, COUNT(*)::int AS count FROM lead_assignments WHERE org_id = $1 GROUP BY user_id ORDER BY count DESC`,
    [orgId],
  );
  return rows as { user_id: string; count: number }[];
}
