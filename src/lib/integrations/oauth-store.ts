import { appPool, ensureAppSchema } from '@/lib/app-pg';
import crypto from 'crypto';

export interface OAuthConnection {
  id: string;
  org_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_at: string | null;
  scope: string | null;
  account_id: string | null;
  account_name: string | null;
  account_email: string | null;
  raw_data: Record<string, unknown>;
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
      CREATE TABLE IF NOT EXISTS oauth_connections (
        id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        org_id        TEXT NOT NULL,
        provider      TEXT NOT NULL,
        access_token  TEXT NOT NULL,
        refresh_token TEXT,
        token_type    TEXT NOT NULL DEFAULT 'Bearer',
        expires_at    TIMESTAMPTZ,
        scope         TEXT,
        account_id    TEXT,
        account_name  TEXT,
        account_email TEXT,
        raw_data      JSONB NOT NULL DEFAULT '{}',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_oauth_connections_org_provider ON oauth_connections(org_id, provider)`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state      TEXT PRIMARY KEY,
        org_id     TEXT NOT NULL,
        provider   TEXT NOT NULL,
        redirect   TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function saveOAuthState(state: string, orgId: string, provider: string, redirect?: string): Promise<void> {
  await ensureReady();
  await appPool().query(
    `INSERT INTO oauth_states (state, org_id, provider, redirect) VALUES ($1, $2, $3, $4)`,
    [state, orgId, provider, redirect ?? null],
  );
  // Clean up old states (older than 10 minutes)
  await appPool().query(`DELETE FROM oauth_states WHERE created_at < now() - interval '10 minutes'`);
}

export async function consumeOAuthState(state: string): Promise<{ org_id: string; provider: string; redirect: string | null } | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `DELETE FROM oauth_states WHERE state = $1 RETURNING org_id, provider, redirect`,
    [state],
  );
  return rows[0] ?? null;
}

export async function upsertOAuthConnection(
  orgId: string,
  provider: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  },
  account?: {
    id?: string;
    name?: string;
    email?: string;
  },
  rawData?: Record<string, unknown>,
): Promise<OAuthConnection> {
  await ensureReady();
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { rows } = await appPool().query(
    `INSERT INTO oauth_connections (org_id, provider, access_token, refresh_token, token_type, expires_at, scope, account_id, account_name, account_email, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (org_id, provider) DO UPDATE SET
       access_token = $3, refresh_token = COALESCE($4, oauth_connections.refresh_token),
       token_type = $5, expires_at = $6, scope = COALESCE($7, oauth_connections.scope),
       account_id = COALESCE($8, oauth_connections.account_id),
       account_name = COALESCE($9, oauth_connections.account_name),
       account_email = COALESCE($10, oauth_connections.account_email),
       raw_data = $11, updated_at = now()
     RETURNING *`,
    [
      orgId, provider,
      tokens.access_token, tokens.refresh_token ?? null, tokens.token_type ?? 'Bearer',
      expiresAt, tokens.scope ?? null,
      account?.id ?? null, account?.name ?? null, account?.email ?? null,
      JSON.stringify(rawData ?? {}),
    ],
  );
  return rows[0] as OAuthConnection;
}

export async function getOAuthConnection(orgId: string, provider: string): Promise<OAuthConnection | null> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM oauth_connections WHERE org_id = $1 AND provider = $2`,
    [orgId, provider],
  );
  return (rows[0] as OAuthConnection) ?? null;
}

export async function listOAuthConnections(orgId: string): Promise<OAuthConnection[]> {
  await ensureReady();
  const { rows } = await appPool().query(
    `SELECT * FROM oauth_connections WHERE org_id = $1 ORDER BY provider`,
    [orgId],
  );
  return rows as OAuthConnection[];
}

export async function deleteOAuthConnection(orgId: string, provider: string): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await appPool().query(
    `DELETE FROM oauth_connections WHERE org_id = $1 AND provider = $2`,
    [orgId, provider],
  );
  return (rowCount ?? 0) > 0;
}

export async function isTokenExpired(connection: OAuthConnection): Promise<boolean> {
  if (!connection.expires_at) return false;
  return new Date(connection.expires_at).getTime() < Date.now() + 60000; // 1 minute buffer
}
