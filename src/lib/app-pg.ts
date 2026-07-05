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
  })().catch((err) => {
    schemaReady = null; // allow retry on next call if the first attempt failed
    throw err;
  });
  return schemaReady;
}
