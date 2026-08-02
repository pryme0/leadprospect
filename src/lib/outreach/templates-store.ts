import { appPool, ensureAppSchema } from '@/lib/app-pg';

export interface OutreachTemplate {
  id: string;
  org_id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string;
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
      CREATE TABLE IF NOT EXISTS outreach_templates (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id     TEXT NOT NULL,
        name       TEXT NOT NULL,
        subject    TEXT,
        body       TEXT NOT NULL,
        category   TEXT NOT NULL DEFAULT 'general',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_outreach_templates_org ON outreach_templates(org_id)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export async function createTemplate(
  orgId: string,
  name: string,
  body: string,
  category = 'general',
  subject?: string,
): Promise<OutreachTemplate> {
  await ensureReady();
  const { rows } = await appPool().query(
    `INSERT INTO outreach_templates (org_id, name, subject, body, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orgId, name.trim(), subject?.trim() ?? null, body.trim(), category],
  );
  return rows[0] as OutreachTemplate;
}

export async function listTemplates(orgId: string): Promise<OutreachTemplate[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM outreach_templates WHERE org_id = $1 ORDER BY name`,
    [orgId],
  );
  return rows as OutreachTemplate[];
}

export async function getTemplate(orgId: string, templateId: string): Promise<OutreachTemplate | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM outreach_templates WHERE org_id = $1 AND id = $2`,
    [orgId, templateId],
  );
  return (rows[0] as OutreachTemplate) ?? null;
}

export async function updateTemplate(
  orgId: string,
  templateId: string,
  updates: { name?: string; subject?: string; body?: string; category?: string },
): Promise<OutreachTemplate | null> {
  await ensureReady();
  const sets: string[] = ['updated_at = now()'];
  const params: unknown[] = [];

  if (updates.name !== undefined) { params.push(updates.name.trim()); sets.push(`name = $${params.length}`); }
  if (updates.subject !== undefined) { params.push(updates.subject?.trim() ?? null); sets.push(`subject = $${params.length}`); }
  if (updates.body !== undefined) { params.push(updates.body.trim()); sets.push(`body = $${params.length}`); }
  if (updates.category !== undefined) { params.push(updates.category); sets.push(`category = $${params.length}`); }

  params.push(orgId, templateId);
  const { rows } = await appPool().query(
    `UPDATE outreach_templates SET ${sets.join(', ')}
     WHERE org_id = $${params.length - 1} AND id = $${params.length}
     RETURNING *`,
    params,
  );
  return (rows[0] as OutreachTemplate) ?? null;
}

export async function deleteTemplate(orgId: string, templateId: string): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await appPool().query(
    `DELETE FROM outreach_templates WHERE org_id = $1 AND id = $2`,
    [orgId, templateId],
  );
  return (rowCount ?? 0) > 0;
}
