import { appPool, ensureAppSchema } from '@/lib/app-pg';

export interface LeadTag {
  id: string;
  org_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface LeadTagAssignment {
  lead_id: string;
  tag_id: string;
}

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    const p = appPool();
    await p.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS lead_tags (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id     TEXT NOT NULL,
        name       TEXT NOT NULL,
        color      TEXT NOT NULL DEFAULT '#6D5EF9',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_lead_tags_org_name ON lead_tags(org_id, name)`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS lead_tag_assignments (
        org_id   TEXT NOT NULL,
        lead_id  TEXT NOT NULL,
        tag_id   TEXT NOT NULL,
        PRIMARY KEY (org_id, lead_id, tag_id)
      );
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_tag_assignments_lead ON lead_tag_assignments(org_id, lead_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_lead_tag_assignments_tag ON lead_tag_assignments(org_id, tag_id)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

const DEFAULT_COLORS = ['#6D5EF9', '#21F2A6', '#FFB547', '#EF4444', '#4F8AFF', '#F472B6', '#22D3EE', '#A78BFA'];

export async function createTag(orgId: string, name: string, color?: string): Promise<LeadTag> {
  await ensureReady();
  const { rows: existing } = await appPool().query(
    `SELECT COUNT(*)::int AS cnt FROM lead_tags WHERE org_id = $1`,
    [orgId],
  );
  const idx = (existing[0]?.cnt ?? 0) % DEFAULT_COLORS.length;
  const { rows } = await appPool().query(
    `INSERT INTO lead_tags (org_id, name, color) VALUES ($1, $2, $3)
     ON CONFLICT (org_id, name) DO UPDATE SET color = EXCLUDED.color
     RETURNING *`,
    [orgId, name.trim(), color ?? DEFAULT_COLORS[idx]],
  );
  return rows[0] as LeadTag;
}

export async function listTags(orgId: string): Promise<LeadTag[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM lead_tags WHERE org_id = $1 ORDER BY name`,
    [orgId],
  );
  return rows as LeadTag[];
}

export async function deleteTag(orgId: string, tagId: string): Promise<boolean> {
  await ensureReady();
  await appPool().query(`DELETE FROM lead_tag_assignments WHERE org_id = $1 AND tag_id = $2`, [orgId, tagId]);
  const { rowCount } = await appPool().query(`DELETE FROM lead_tags WHERE org_id = $1 AND id = $2`, [orgId, tagId]);
  return (rowCount ?? 0) > 0;
}

export async function assignTag(orgId: string, leadId: string, tagId: string): Promise<void> {
  await ensureReady();
  await appPool().query(
    `INSERT INTO lead_tag_assignments (org_id, lead_id, tag_id) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [orgId, leadId, tagId],
  );
}

export async function unassignTag(orgId: string, leadId: string, tagId: string): Promise<void> {
  await ensureReady();
  await appPool().query(
    `DELETE FROM lead_tag_assignments WHERE org_id = $1 AND lead_id = $2 AND tag_id = $3`,
    [orgId, leadId, tagId],
  );
}

export async function getTagsForLead(orgId: string, leadId: string): Promise<LeadTag[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT t.* FROM lead_tags t
     JOIN lead_tag_assignments a ON a.tag_id = t.id AND a.org_id = t.org_id
     WHERE a.org_id = $1 AND a.lead_id = $2
     ORDER BY t.name`,
    [orgId, leadId],
  );
  return rows as LeadTag[];
}

export async function getTagsForLeads(orgId: string, leadIds: string[]): Promise<Record<string, LeadTag[]>> {
  if (leadIds.length === 0) return {};
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT a.lead_id, t.id, t.org_id, t.name, t.color, t.created_at
     FROM lead_tags t
     JOIN lead_tag_assignments a ON a.tag_id = t.id AND a.org_id = t.org_id
     WHERE a.org_id = $1 AND a.lead_id = ANY($2)
     ORDER BY t.name`,
    [orgId, leadIds],
  );
  const out: Record<string, LeadTag[]> = {};
  for (const r of rows as (LeadTag & { lead_id: string })[]) {
    (out[r.lead_id] ??= []).push({ id: r.id, org_id: r.org_id, name: r.name, color: r.color, created_at: r.created_at });
  }
  return out;
}

export async function getLeadsByTag(orgId: string, tagId: string): Promise<string[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT lead_id FROM lead_tag_assignments WHERE org_id = $1 AND tag_id = $2`,
    [orgId, tagId],
  );
  return rows.map((r: { lead_id: string }) => r.lead_id);
}
