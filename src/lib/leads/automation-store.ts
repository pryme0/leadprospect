import { appPool, ensureAppSchema } from '@/lib/app-pg';

export interface AutomationRule {
  id: string;
  org_id: string;
  name: string;
  trigger_type: 'intent' | 'source' | 'tag' | 'new_lead';
  trigger_value: string | null;
  action_type: 'add_tag' | 'assign_user' | 'move_stage' | 'send_notification';
  action_value: string;
  enabled: boolean;
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
      CREATE TABLE IF NOT EXISTS automation_rules (
        id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id        TEXT NOT NULL,
        name          TEXT NOT NULL,
        trigger_type  TEXT NOT NULL,
        trigger_value TEXT,
        action_type   TEXT NOT NULL,
        action_value  TEXT NOT NULL,
        enabled       BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_automation_rules_org ON automation_rules(org_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_automation_rules_enabled ON automation_rules(org_id, enabled)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export async function createRule(
  orgId: string,
  name: string,
  triggerType: AutomationRule['trigger_type'],
  triggerValue: string | null,
  actionType: AutomationRule['action_type'],
  actionValue: string,
): Promise<AutomationRule> {
  await ensureReady();
  const { rows } = await appPool().query(
    `INSERT INTO automation_rules (org_id, name, trigger_type, trigger_value, action_type, action_value)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [orgId, name.trim(), triggerType, triggerValue, actionType, actionValue],
  );
  return rows[0] as AutomationRule;
}

export async function listRules(orgId: string): Promise<AutomationRule[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM automation_rules WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId],
  );
  return rows as AutomationRule[];
}

export async function getEnabledRules(orgId: string): Promise<AutomationRule[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM automation_rules WHERE org_id = $1 AND enabled = true ORDER BY created_at`,
    [orgId],
  );
  return rows as AutomationRule[];
}

export async function updateRule(
  orgId: string,
  ruleId: string,
  updates: Partial<Pick<AutomationRule, 'name' | 'trigger_type' | 'trigger_value' | 'action_type' | 'action_value' | 'enabled'>>,
): Promise<AutomationRule | null> {
  await ensureReady();
  const sets: string[] = ['updated_at = now()'];
  const params: unknown[] = [];

  if (updates.name !== undefined) { params.push(updates.name.trim()); sets.push(`name = $${params.length}`); }
  if (updates.trigger_type !== undefined) { params.push(updates.trigger_type); sets.push(`trigger_type = $${params.length}`); }
  if (updates.trigger_value !== undefined) { params.push(updates.trigger_value); sets.push(`trigger_value = $${params.length}`); }
  if (updates.action_type !== undefined) { params.push(updates.action_type); sets.push(`action_type = $${params.length}`); }
  if (updates.action_value !== undefined) { params.push(updates.action_value); sets.push(`action_value = $${params.length}`); }
  if (updates.enabled !== undefined) { params.push(updates.enabled); sets.push(`enabled = $${params.length}`); }

  params.push(orgId, ruleId);
  const { rows } = await appPool().query(
    `UPDATE automation_rules SET ${sets.join(', ')}
     WHERE org_id = $${params.length - 1} AND id = $${params.length}
     RETURNING *`,
    params,
  );
  return (rows[0] as AutomationRule) ?? null;
}

export async function deleteRule(orgId: string, ruleId: string): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await appPool().query(
    `DELETE FROM automation_rules WHERE org_id = $1 AND id = $2`,
    [orgId, ruleId],
  );
  return (rowCount ?? 0) > 0;
}

export async function toggleRule(orgId: string, ruleId: string, enabled: boolean): Promise<AutomationRule | null> {
  return updateRule(orgId, ruleId, { enabled });
}
