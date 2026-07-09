import type { Pool } from 'pg';
import { getSignalsPool } from '@/lib/crawler/signals-db';

/**
 * Shared Postgres for APP tables (org_profiles, subscriptions) — the per-user
 * config that must be consistent across environments (local ↔ prod), the same
 * way crawler leads already are. Reuses the crawler signals pool (same shared
 * DATABASE_URL). Auth/users, comms and leads capture stay in SQLite.
 */
export function appPool(): Pool {
  const p = getSignalsPool();
  if (!p) throw new Error('App Postgres not configured (DATABASE_URL missing)');
  return p;
}

let schemaReady: Promise<void> | null = null;

/** Create the app tables in Postgres if missing (idempotent, cached). */
export function ensureAppSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const p = appPool();
    // Authentication users — the login source of truth, shared across every
    // environment (local ↔ prod) so an account created anywhere logs in
    // everywhere. Hashing scheme is unchanged from the old SQLite store
    // (pbkdf2 100k/sha512) so migrated hashes/salts verify as-is.
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        role       TEXT NOT NULL DEFAULT 'viewer',
        pwd_hash   TEXT NOT NULL,
        pwd_salt   TEXT NOT NULL,
        is_active  INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        org_id     TEXT
      );
    `);
    // Case-insensitive unique email (the SQLite table used COLLATE NOCASE).
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower ON users(lower(email))`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_users_org ON users(org_id)`);

    // Per-user integration OAuth app credentials (client id/secret; secret encrypted).
    await p.query(`
      CREATE TABLE IF NOT EXISTS integration_credentials (
        user_id        TEXT NOT NULL,
        integration_id TEXT NOT NULL,
        client_id      TEXT NOT NULL,
        client_secret  TEXT,
        config_json    TEXT,
        updated_at     TEXT NOT NULL,
        PRIMARY KEY (user_id, integration_id)
      );
    `);
    // Per-user integration connections (OAuth tokens, encrypted at rest).
    await p.query(`
      CREATE TABLE IF NOT EXISTS integration_connections (
        user_id        TEXT NOT NULL,
        integration_id TEXT NOT NULL,
        access_token   TEXT,
        refresh_token  TEXT,
        instance_url   TEXT,
        account_label  TEXT,
        scopes         TEXT,
        extra_json     TEXT,
        connected_at   TEXT NOT NULL,
        updated_at     TEXT NOT NULL,
        PRIMARY KEY (user_id, integration_id)
      );
    `);
    // Signup access requests (was per-env SQLite).
    await p.query(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        company    TEXT,
        phone      TEXT,
        message    TEXT,
        status     TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL
      );
    `);
    // Small key/value used by org-linkage (persistent guard).
    await p.query(`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS org_profiles (
        user_id              TEXT PRIMARY KEY,
        company_name         TEXT,
        website              TEXT,
        contact_email        TEXT,
        timezone             TEXT,
        logo_url             TEXT,
        industry             TEXT,
        about                TEXT,
        services             TEXT,
        expectations         TEXT,
        crawler_sbu_id       TEXT,
        analysis_json        TEXT,
        analyzed_at          TEXT,
        brand_keywords       TEXT,
        brand_handles        TEXT,
        exclude_terms        TEXT,
        mentions_analyzed_at TEXT,
        updated_at           TEXT NOT NULL DEFAULT ''
      );
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        user_id      TEXT PRIMARY KEY,
        modules_json TEXT NOT NULL DEFAULT '[]',
        plan_tier    TEXT,
        billing      TEXT,
        paystack_ref TEXT,
        activated_at TEXT,
        updated_at   TEXT NOT NULL DEFAULT ''
      );
    `);
    // Access-window columns (super-admin credits/trials). valid_until NULL = an
    // ongoing subscription; a set value = access granted until then (credit/trial),
    // after which entitlement is revoked and crawling is stopped.
    await p.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS valid_until TEXT`);
    await p.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grant_kind  TEXT`);
    await p.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grant_note  TEXT`);

    // Append-only transactions ledger — every Paystack payment + every manual
    // super-admin grant/suspend, for the platform audit log + notifications.
    await p.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id         TEXT PRIMARY KEY,
        org_id     TEXT NOT NULL,
        type       TEXT NOT NULL,           -- 'payment' | 'grant' | 'suspend'
        email      TEXT,
        amount     BIGINT,                  -- minor units (kobo/cents); null for non-payments
        currency   TEXT,
        plan_tier  TEXT,
        billing    TEXT,
        reference  TEXT,                    -- Paystack reference (payments only)
        status     TEXT,
        channel    TEXT,
        note       TEXT,
        actor      TEXT,                    -- super-admin email for manual actions
        paid_at    TEXT,
        created_at TEXT NOT NULL,
        seen       INTEGER NOT NULL DEFAULT 0
      );
    `);
    // Idempotent payment capture: a reference can only be recorded once.
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_reference ON transactions(reference) WHERE reference IS NOT NULL`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_transactions_created ON transactions(created_at DESC)`);
  })().catch((err) => {
    schemaReady = null; // allow retry on next call if the first attempt failed
    throw err;
  });
  return schemaReady;
}
