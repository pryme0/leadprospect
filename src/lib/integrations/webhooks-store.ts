import { appPool, ensureAppSchema } from '@/lib/app-pg';
import crypto from 'crypto';

export interface Webhook {
  id: string;
  org_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  last_triggered_at: string | null;
  last_status: number | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event: string;
  payload: object;
  status: number | null;
  response: string | null;
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
      CREATE TABLE IF NOT EXISTS webhooks (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id            TEXT NOT NULL,
        name              TEXT NOT NULL,
        url               TEXT NOT NULL,
        secret            TEXT NOT NULL,
        events            TEXT[] NOT NULL DEFAULT '{}',
        enabled           BOOLEAN NOT NULL DEFAULT true,
        last_triggered_at TIMESTAMPTZ,
        last_status       INT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_webhooks_org ON webhooks(org_id)`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event      TEXT NOT NULL,
        payload    JSONB NOT NULL,
        status     INT,
        response   TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC)`);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

function generateSecret(): string {
  return 'whsec_' + crypto.randomBytes(24).toString('hex');
}

export async function createWebhook(
  orgId: string,
  name: string,
  url: string,
  events: string[],
): Promise<Webhook> {
  await ensureReady();
  const secret = generateSecret();
  const { rows } = await appPool().query(
    `INSERT INTO webhooks (org_id, name, url, secret, events)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orgId, name.trim(), url.trim(), secret, events],
  );
  return rows[0] as Webhook;
}

export async function listWebhooks(orgId: string): Promise<Webhook[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM webhooks WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId],
  );
  return rows as Webhook[];
}

export async function getWebhook(orgId: string, webhookId: string): Promise<Webhook | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM webhooks WHERE org_id = $1 AND id = $2`,
    [orgId, webhookId],
  );
  return (rows[0] as Webhook) ?? null;
}

export async function updateWebhook(
  orgId: string,
  webhookId: string,
  updates: { name?: string; url?: string; events?: string[]; enabled?: boolean },
): Promise<Webhook | null> {
  await ensureReady();
  const sets: string[] = ['updated_at = now()'];
  const params: unknown[] = [];

  if (updates.name !== undefined) { params.push(updates.name.trim()); sets.push(`name = $${params.length}`); }
  if (updates.url !== undefined) { params.push(updates.url.trim()); sets.push(`url = $${params.length}`); }
  if (updates.events !== undefined) { params.push(updates.events); sets.push(`events = $${params.length}`); }
  if (updates.enabled !== undefined) { params.push(updates.enabled); sets.push(`enabled = $${params.length}`); }

  params.push(orgId, webhookId);
  const { rows } = await appPool().query(
    `UPDATE webhooks SET ${sets.join(', ')}
     WHERE org_id = $${params.length - 1} AND id = $${params.length}
     RETURNING *`,
    params,
  );
  return (rows[0] as Webhook) ?? null;
}

export async function deleteWebhook(orgId: string, webhookId: string): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await appPool().query(
    `DELETE FROM webhooks WHERE org_id = $1 AND id = $2`,
    [orgId, webhookId],
  );
  return (rowCount ?? 0) > 0;
}

export async function regenerateSecret(orgId: string, webhookId: string): Promise<string | null> {
  await ensureReady();
  const secret = generateSecret();
  const { rowCount } = await appPool().query(
    `UPDATE webhooks SET secret = $3, updated_at = now() WHERE org_id = $1 AND id = $2`,
    [orgId, webhookId, secret],
  );
  return (rowCount ?? 0) > 0 ? secret : null;
}

export async function getWebhookLogs(webhookId: string, limit = 50): Promise<WebhookLog[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM webhook_logs WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [webhookId, limit],
  );
  return rows as WebhookLog[];
}

export async function logWebhookCall(
  webhookId: string,
  event: string,
  payload: object,
  status: number | null,
  response: string | null,
): Promise<void> {
  await ensureReady();
  await appPool().query(
    `INSERT INTO webhook_logs (webhook_id, event, payload, status, response) VALUES ($1, $2, $3, $4, $5)`,
    [webhookId, event, JSON.stringify(payload), status, response],
  );
  await appPool().query(
    `UPDATE webhooks SET last_triggered_at = now(), last_status = $2 WHERE id = $1`,
    [webhookId, status],
  );
}

export async function getEnabledWebhooksForEvent(orgId: string, event: string): Promise<Webhook[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM webhooks WHERE org_id = $1 AND enabled = true AND $2 = ANY(events)`,
    [orgId, event],
  );
  return rows as Webhook[];
}

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.updated',
  'lead.stage_changed',
  'lead.assigned',
  'lead.tagged',
  'outreach.sent',
  'outreach.replied',
  'pipeline.won',
  'pipeline.lost',
] as const;
