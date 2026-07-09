/**
 * Per-user integration store — now on the SHARED Postgres (`integration_credentials`
 * + `integration_connections`), so a channel/app connected in any environment is
 * visible everywhere. OAuth tokens & client secrets are encrypted at rest with an
 * AUTH_SECRET-derived key (AES-256-GCM); plaintext never leaves the server.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { migrateSqliteTable } from '@/lib/pg-migrate';

const KEY = createHash('sha256').update(process.env.AUTH_SECRET ?? 'synq-internal-2026-xk9m').digest(); // 32 bytes

function encrypt(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    const [ivB, tagB, dataB] = blob.split(':');
    const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/* ── Readiness: schema + one-time migration of the old app.db integration rows ── */

let ready: Promise<void> | null = null;
function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    await migrateSqliteTable({
      file: 'app.db', table: 'integration_credentials',
      columns: ['user_id', 'integration_id', 'client_id', 'client_secret', 'config_json', 'updated_at'],
      conflict: 'ON CONFLICT (user_id, integration_id) DO NOTHING',
    });
    await migrateSqliteTable({
      file: 'app.db', table: 'integration_connections',
      columns: ['user_id', 'integration_id', 'access_token', 'refresh_token', 'instance_url',
                'account_label', 'scopes', 'extra_json', 'connected_at', 'updated_at'],
      conflict: 'ON CONFLICT (user_id, integration_id) DO NOTHING',
    });
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export interface IntegrationConnection {
  user_id: string;
  integration_id: string;
  access_token: string | null;
  refresh_token: string | null;
  instance_url: string | null;
  account_label: string | null;
  scopes: string | null;
  extra: Record<string, unknown>;
  connected_at: string;
  updated_at: string;
}

interface Row {
  user_id: string; integration_id: string;
  access_token: string | null; refresh_token: string | null;
  instance_url: string | null; account_label: string | null;
  scopes: string | null; extra_json: string | null;
  connected_at: string; updated_at: string;
}

function toConn(r: Row): IntegrationConnection {
  let extra: Record<string, unknown> = {};
  if (r.extra_json) { try { extra = JSON.parse(r.extra_json); } catch { extra = {}; } }
  return {
    user_id: r.user_id,
    integration_id: r.integration_id,
    access_token: decrypt(r.access_token),
    refresh_token: decrypt(r.refresh_token),
    instance_url: r.instance_url,
    account_label: r.account_label,
    scopes: r.scopes,
    extra,
    connected_at: r.connected_at,
    updated_at: r.updated_at,
  };
}

export async function getConnection(userId: string, integrationId: string): Promise<IntegrationConnection | null> {
  await ensureReady();
  const r = await appPool().query(
    'SELECT * FROM integration_connections WHERE user_id = $1 AND integration_id = $2',
    [userId, integrationId],
  );
  return r.rows[0] ? toConn(r.rows[0] as Row) : null;
}

export async function listConnections(userId: string): Promise<IntegrationConnection[]> {
  await ensureReady();
  const r = await appPool().query('SELECT * FROM integration_connections WHERE user_id = $1', [userId]);
  return (r.rows as Row[]).map(toConn);
}

export interface UpsertInput {
  access_token?: string | null;
  refresh_token?: string | null;
  instance_url?: string | null;
  account_label?: string | null;
  scopes?: string | null;
  extra?: Record<string, unknown>;
}

export async function upsertConnection(userId: string, integrationId: string, data: UpsertInput): Promise<IntegrationConnection> {
  await ensureReady();
  const now = new Date().toISOString();
  const existing = await getConnection(userId, integrationId);
  await appPool().query(
    `INSERT INTO integration_connections
       (user_id, integration_id, access_token, refresh_token, instance_url, account_label, scopes, extra_json, connected_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id, integration_id) DO UPDATE SET
       access_token  = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, integration_connections.refresh_token),
       instance_url  = EXCLUDED.instance_url,
       account_label = EXCLUDED.account_label,
       scopes        = EXCLUDED.scopes,
       extra_json    = EXCLUDED.extra_json,
       updated_at    = EXCLUDED.updated_at`,
    [
      userId, integrationId,
      encrypt(data.access_token),
      data.refresh_token !== undefined ? encrypt(data.refresh_token) : null,
      data.instance_url ?? null,
      data.account_label ?? null,
      data.scopes ?? null,
      JSON.stringify(data.extra ?? {}),
      existing?.connected_at ?? now,
      now,
    ],
  );
  return (await getConnection(userId, integrationId))!;
}

export async function deleteConnection(userId: string, integrationId: string): Promise<boolean> {
  await ensureReady();
  const r = await appPool().query(
    'DELETE FROM integration_connections WHERE user_id = $1 AND integration_id = $2',
    [userId, integrationId],
  );
  return (r.rowCount ?? 0) > 0;
}

/* ── Per-user OAuth app credentials (Consumer Key/Secret etc.) ────────────────── */

export interface IntegrationCredentials {
  client_id: string;
  client_secret: string | null;
  config: Record<string, string>;
}

export async function saveCredentials(userId: string, integrationId: string, data: { client_id: string; client_secret?: string | null; config?: Record<string, string> }): Promise<void> {
  await ensureReady();
  const now = new Date().toISOString();
  const existing = await getCredentials(userId, integrationId);
  await appPool().query(
    `INSERT INTO integration_credentials (user_id, integration_id, client_id, client_secret, config_json, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, integration_id) DO UPDATE SET
       client_id     = EXCLUDED.client_id,
       client_secret = COALESCE(EXCLUDED.client_secret, integration_credentials.client_secret),
       config_json   = EXCLUDED.config_json,
       updated_at    = EXCLUDED.updated_at`,
    [
      userId, integrationId, data.client_id,
      // Only re-encrypt when a new secret is supplied; otherwise keep the existing one.
      data.client_secret ? encrypt(data.client_secret) : null,
      JSON.stringify(data.config ?? existing?.config ?? {}),
      now,
    ],
  );
}

export async function getCredentials(userId: string, integrationId: string): Promise<IntegrationCredentials | null> {
  await ensureReady();
  const r = await appPool().query(
    'SELECT client_id, client_secret, config_json FROM integration_credentials WHERE user_id = $1 AND integration_id = $2',
    [userId, integrationId],
  );
  const row = r.rows[0] as { client_id: string; client_secret: string | null; config_json: string | null } | undefined;
  if (!row) return null;
  let config: Record<string, string> = {};
  if (row.config_json) { try { config = JSON.parse(row.config_json); } catch { config = {}; } }
  return { client_id: row.client_id, client_secret: decrypt(row.client_secret), config };
}

export async function hasCredentials(userId: string, integrationId: string): Promise<boolean> {
  const c = await getCredentials(userId, integrationId);
  return !!(c?.client_id && c.client_secret);
}

export async function deleteCredentials(userId: string, integrationId: string): Promise<boolean> {
  await ensureReady();
  const r = await appPool().query(
    'DELETE FROM integration_credentials WHERE user_id = $1 AND integration_id = $2',
    [userId, integrationId],
  );
  return (r.rowCount ?? 0) > 0;
}
