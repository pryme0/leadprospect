import { appPool, ensureAppSchema } from '@/lib/app-pg';

export type IntegrationType = 'slack' | 'zapier' | 'google_sheets' | 'email' | 'hubspot' | 'salesforce' | 'pipedrive';

export interface Integration {
  id: string;
  org_id: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  last_sync_at: string | null;
  last_error: string | null;
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
      CREATE TABLE IF NOT EXISTS integrations (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id       TEXT NOT NULL,
        type         TEXT NOT NULL,
        name         TEXT NOT NULL,
        config       JSONB NOT NULL DEFAULT '{}',
        enabled      BOOLEAN NOT NULL DEFAULT true,
        last_sync_at TIMESTAMPTZ,
        last_error   TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_integrations_org ON integrations(org_id)`);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_integrations_org_type ON integrations(org_id, type)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export async function upsertIntegration(
  orgId: string,
  type: IntegrationType,
  name: string,
  config: Record<string, unknown>,
): Promise<Integration> {
  await ensureReady();
  const { rows } = await appPool().query(
    `INSERT INTO integrations (org_id, type, name, config)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (org_id, type) DO UPDATE SET name = $3, config = $4, updated_at = now()
     RETURNING *`,
    [orgId, type, name.trim(), JSON.stringify(config)],
  );
  return rows[0] as Integration;
}

export async function listIntegrations(orgId: string): Promise<Integration[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM integrations WHERE org_id = $1 ORDER BY type`,
    [orgId],
  );
  return rows as Integration[];
}

export async function getIntegration(orgId: string, type: IntegrationType): Promise<Integration | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM integrations WHERE org_id = $1 AND type = $2`,
    [orgId, type],
  );
  return (rows[0] as Integration) ?? null;
}

export async function updateIntegrationConfig(
  orgId: string,
  type: IntegrationType,
  config: Record<string, unknown>,
): Promise<Integration | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `UPDATE integrations SET config = $3, updated_at = now()
     WHERE org_id = $1 AND type = $2
     RETURNING *`,
    [orgId, type, JSON.stringify(config)],
  );
  return (rows[0] as Integration) ?? null;
}

export async function toggleIntegration(orgId: string, type: IntegrationType, enabled: boolean): Promise<Integration | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `UPDATE integrations SET enabled = $3, updated_at = now()
     WHERE org_id = $1 AND type = $2
     RETURNING *`,
    [orgId, type, enabled],
  );
  return (rows[0] as Integration) ?? null;
}

export async function deleteIntegration(orgId: string, type: IntegrationType): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await appPool().query(
    `DELETE FROM integrations WHERE org_id = $1 AND type = $2`,
    [orgId, type],
  );
  return (rowCount ?? 0) > 0;
}

export async function updateSyncStatus(
  orgId: string,
  type: IntegrationType,
  error: string | null,
): Promise<void> {
  await ensureReady();
  await appPool().query(
    `UPDATE integrations SET last_sync_at = now(), last_error = $3, updated_at = now()
     WHERE org_id = $1 AND type = $2`,
    [orgId, type, error],
  );
}

export async function getEnabledIntegration(orgId: string, type: IntegrationType): Promise<Integration | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM integrations WHERE org_id = $1 AND type = $2 AND enabled = true`,
    [orgId, type],
  );
  return (rows[0] as Integration) ?? null;
}

// Integration config schemas for reference
export const INTEGRATION_SCHEMAS: Record<IntegrationType, { fields: { key: string; label: string; type: 'text' | 'password' | 'url' | 'select'; required: boolean; options?: string[] }[] }> = {
  slack: {
    fields: [
      { key: 'webhook_url', label: 'Slack Webhook URL', type: 'url', required: true },
      { key: 'channel', label: 'Channel', type: 'text', required: false },
      { key: 'notify_on', label: 'Notify On', type: 'select', required: true, options: ['new_lead', 'stage_change', 'won', 'all'] },
    ],
  },
  zapier: {
    fields: [
      { key: 'webhook_url', label: 'Zapier Webhook URL', type: 'url', required: true },
      { key: 'trigger_on', label: 'Trigger On', type: 'select', required: true, options: ['new_lead', 'stage_change', 'won', 'all'] },
    ],
  },
  google_sheets: {
    fields: [
      { key: 'spreadsheet_id', label: 'Spreadsheet ID', type: 'text', required: true },
      { key: 'sheet_name', label: 'Sheet Name', type: 'text', required: false },
      { key: 'sync_frequency', label: 'Sync Frequency', type: 'select', required: true, options: ['realtime', 'hourly', 'daily'] },
    ],
  },
  email: {
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true },
      { key: 'smtp_port', label: 'SMTP Port', type: 'text', required: true },
      { key: 'smtp_user', label: 'SMTP Username', type: 'text', required: true },
      { key: 'smtp_pass', label: 'SMTP Password', type: 'password', required: true },
      { key: 'from_email', label: 'From Email', type: 'text', required: true },
      { key: 'from_name', label: 'From Name', type: 'text', required: false },
    ],
  },
  hubspot: {
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'portal_id', label: 'Portal ID', type: 'text', required: false },
      { key: 'sync_contacts', label: 'Sync Contacts', type: 'select', required: true, options: ['all', 'won_only', 'qualified_up'] },
    ],
  },
  salesforce: {
    fields: [
      { key: 'instance_url', label: 'Instance URL', type: 'url', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
  pipedrive: {
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
      { key: 'pipeline_id', label: 'Pipeline ID', type: 'text', required: false },
      { key: 'sync_deals', label: 'Sync Deals', type: 'select', required: true, options: ['all', 'won_only', 'qualified_up'] },
    ],
  },
};
