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
    // Referral attribution: the code (if any) the referred org signed up under.
    await p.query(`ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS referred_by_code TEXT`);
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
    // SYNQ Hub — public directory listing columns. A business appears in the
    // public /hub only after it opts in (hub_listed=true) and gets a frozen,
    // SEO-friendly slug. hub_category/hub_location are normalized at profile-save
    // time so directory pages query by column instead of scanning free text.
    await p.query(`ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS hub_slug        TEXT`);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_org_profiles_hub_slug ON org_profiles(hub_slug) WHERE hub_slug IS NOT NULL`);
    await p.query(`ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS hub_listed      BOOLEAN NOT NULL DEFAULT false`);
    await p.query(`ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS hub_premium     BOOLEAN NOT NULL DEFAULT false`);
    await p.query(`ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS hub_category    TEXT`);
    await p.query(`ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS hub_location    TEXT`);
    await p.query(`ALTER TABLE org_profiles ADD COLUMN IF NOT EXISTS hub_verified_at TEXT`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_org_profiles_hub_listed ON org_profiles(hub_listed) WHERE hub_listed = true`);
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

    // ── Referral system ──────────────────────────────────────────────────────
    // Per-org referral state: a shareable code, points earned/held, who referred
    // this org, and the currently-active bonus to the daily HIGH-intent lead cap
    // (bonus_leads_until NULL/past = inactive). org_id = the owner user's id.
    await p.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        org_id              TEXT PRIMARY KEY,
        referral_code       TEXT,
        referred_by_org_id  TEXT,
        points_balance      INTEGER NOT NULL DEFAULT 0,
        points_earned_total INTEGER NOT NULL DEFAULT 0,
        bonus_leads_per_day INTEGER NOT NULL DEFAULT 0,
        bonus_leads_until   TEXT,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL
      );
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_code ON referrals(lower(referral_code)) WHERE referral_code IS NOT NULL`);
    // Append-only ledger of every points earn/redeem. The partial unique index
    // makes awarding idempotent: a given referred org credits its referrer once.
    await p.query(`
      CREATE TABLE IF NOT EXISTS referral_events (
        id              TEXT PRIMARY KEY,
        org_id          TEXT NOT NULL,
        type            TEXT NOT NULL,          -- 'earn' | 'redeem'
        points          INTEGER NOT NULL,
        referred_org_id TEXT,                   -- set on 'earn'
        note            TEXT,
        created_at      TEXT NOT NULL
      );
    `);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_referral_earn_once ON referral_events(org_id, referred_org_id) WHERE type = 'earn' AND referred_org_id IS NOT NULL`);
    await p.query(`CREATE INDEX IF NOT EXISTS ix_referral_events_org ON referral_events(org_id, created_at DESC)`);
  })().catch((err) => {
    schemaReady = null; // allow retry on next call if the first attempt failed
    throw err;
  });
  return schemaReady;
}
