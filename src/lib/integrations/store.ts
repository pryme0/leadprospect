/**
 * Per-user integration connection store (app.db `integration_connections`).
 * OAuth tokens are encrypted at rest with an AUTH_SECRET-derived key (AES-256-GCM).
 * The plaintext tokens never leave the server.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getAuthDb } from '@/lib/auth/db';

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

export function getConnection(userId: string, integrationId: string): IntegrationConnection | null {
  const db = getAuthDb();
  const row = db.prepare('SELECT * FROM integration_connections WHERE user_id = ? AND integration_id = ?')
    .get(userId, integrationId) as Row | undefined;
  return row ? toConn(row) : null;
}

export function listConnections(userId: string): IntegrationConnection[] {
  const db = getAuthDb();
  const rows = db.prepare('SELECT * FROM integration_connections WHERE user_id = ?').all(userId) as Row[];
  return rows.map(toConn);
}

export interface UpsertInput {
  access_token?: string | null;
  refresh_token?: string | null;
  instance_url?: string | null;
  account_label?: string | null;
  scopes?: string | null;
  extra?: Record<string, unknown>;
}

export function upsertConnection(userId: string, integrationId: string, data: UpsertInput): IntegrationConnection {
  const db = getAuthDb();
  const now = new Date().toISOString();
  const existing = getConnection(userId, integrationId);
  db.prepare(`
    INSERT INTO integration_connections
      (user_id, integration_id, access_token, refresh_token, instance_url, account_label, scopes, extra_json, connected_at, updated_at)
    VALUES (@user_id, @integration_id, @access_token, @refresh_token, @instance_url, @account_label, @scopes, @extra_json, @connected_at, @updated_at)
    ON CONFLICT(user_id, integration_id) DO UPDATE SET
      access_token  = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, integration_connections.refresh_token),
      instance_url  = excluded.instance_url,
      account_label = excluded.account_label,
      scopes        = excluded.scopes,
      extra_json    = excluded.extra_json,
      updated_at    = excluded.updated_at
  `).run({
    user_id: userId,
    integration_id: integrationId,
    access_token: encrypt(data.access_token),
    refresh_token: data.refresh_token !== undefined ? encrypt(data.refresh_token) : null,
    instance_url: data.instance_url ?? null,
    account_label: data.account_label ?? null,
    scopes: data.scopes ?? null,
    extra_json: JSON.stringify(data.extra ?? {}),
    connected_at: existing?.connected_at ?? now,
    updated_at: now,
  });
  return getConnection(userId, integrationId)!;
}

export function deleteConnection(userId: string, integrationId: string): boolean {
  const db = getAuthDb();
  const res = db.prepare('DELETE FROM integration_connections WHERE user_id = ? AND integration_id = ?')
    .run(userId, integrationId);
  return res.changes > 0;
}

/* ── Per-user OAuth app credentials (Consumer Key/Secret etc.) ────────────────── */

export interface IntegrationCredentials {
  client_id: string;
  client_secret: string | null;
  config: Record<string, string>;
}

export function saveCredentials(userId: string, integrationId: string, data: { client_id: string; client_secret?: string | null; config?: Record<string, string> }): void {
  const db = getAuthDb();
  const now = new Date().toISOString();
  const existing = getCredentials(userId, integrationId);
  db.prepare(`
    INSERT INTO integration_credentials (user_id, integration_id, client_id, client_secret, config_json, updated_at)
    VALUES (@user_id, @integration_id, @client_id, @client_secret, @config_json, @updated_at)
    ON CONFLICT(user_id, integration_id) DO UPDATE SET
      client_id     = excluded.client_id,
      client_secret = COALESCE(excluded.client_secret, integration_credentials.client_secret),
      config_json   = excluded.config_json,
      updated_at    = excluded.updated_at
  `).run({
    user_id: userId,
    integration_id: integrationId,
    client_id: data.client_id,
    // Only re-encrypt when a new secret is supplied; otherwise keep the existing one.
    client_secret: data.client_secret ? encrypt(data.client_secret) : null,
    config_json: JSON.stringify(data.config ?? existing?.config ?? {}),
    updated_at: now,
  });
}

export function getCredentials(userId: string, integrationId: string): IntegrationCredentials | null {
  const db = getAuthDb();
  const row = db.prepare('SELECT client_id, client_secret, config_json FROM integration_credentials WHERE user_id = ? AND integration_id = ?')
    .get(userId, integrationId) as { client_id: string; client_secret: string | null; config_json: string | null } | undefined;
  if (!row) return null;
  let config: Record<string, string> = {};
  if (row.config_json) { try { config = JSON.parse(row.config_json); } catch { config = {}; } }
  return { client_id: row.client_id, client_secret: decrypt(row.client_secret), config };
}

export function hasCredentials(userId: string, integrationId: string): boolean {
  const c = getCredentials(userId, integrationId);
  return !!(c?.client_id && c.client_secret);
}

export function deleteCredentials(userId: string, integrationId: string): boolean {
  const db = getAuthDb();
  const res = db.prepare('DELETE FROM integration_credentials WHERE user_id = ? AND integration_id = ?')
    .run(userId, integrationId);
  return res.changes > 0;
}
