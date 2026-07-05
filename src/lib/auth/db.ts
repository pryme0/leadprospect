import Database from 'better-sqlite3';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { inferTierFromModules, TIER_MODULES, type ModuleId } from '@/lib/subscription/tiers';
import { sqliteFile } from '@/lib/sqlite-path';

const DB_PATH = sqliteFile('app.db');

let _db: Database.Database | null = null;

export function getAuthDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  bootstrap(_db);
  return _db;
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  is_active: number;
  created_at: string;
}

function bootstrap(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      role       TEXT NOT NULL DEFAULT 'viewer',
      pwd_hash   TEXT NOT NULL,
      pwd_salt   TEXT NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Per-user company/org profile. Server-side home for the fields that were
    -- previously only in browser localStorage (synq_org_profile). The crawler
    -- reads website/about/services from here; crawler_sbu_id + analysis_json are
    -- populated once /api/leads/generate has analysed the website.
    CREATE TABLE IF NOT EXISTS org_profiles (
      user_id        TEXT PRIMARY KEY,
      company_name   TEXT,
      website        TEXT,
      contact_email  TEXT,
      timezone       TEXT,
      logo_url       TEXT,
      industry       TEXT,
      about          TEXT,
      services       TEXT,
      expectations   TEXT,
      crawler_sbu_id TEXT,
      analysis_json  TEXT,
      analyzed_at    TEXT,
      brand_keywords TEXT,
      brand_handles  TEXT,
      exclude_terms  TEXT,
      mentions_analyzed_at TEXT,
      updated_at     TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Per-user subscription entitlement, written when a Paystack payment is
    -- verified. This is the server-side source of truth for "is this user
    -- subscribed to Lead Intelligence" (modules_json contains e.g. ["leads"]).
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id      TEXT PRIMARY KEY,
      modules_json TEXT NOT NULL,
      billing      TEXT,
      paystack_ref TEXT,
      activated_at TEXT,
      updated_at   TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Per-user OAuth *app* credentials (multi-tenant: each user brings their own
    -- provider app — Consumer Key/Secret etc.). client_secret is encrypted.
    CREATE TABLE IF NOT EXISTS integration_credentials (
      user_id        TEXT NOT NULL,
      integration_id TEXT NOT NULL,
      client_id      TEXT NOT NULL,
      client_secret  TEXT,
      config_json    TEXT,
      updated_at     TEXT NOT NULL,
      PRIMARY KEY (user_id, integration_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Per-user third-party integration connections (OAuth tokens etc.).
    -- Tokens are stored encrypted (see src/lib/integrations/store.ts).
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
      PRIMARY KEY (user_id, integration_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Add brand-monitoring columns to a pre-existing org_profiles table.
  const orgCols = new Set((db.prepare('PRAGMA table_info(org_profiles)').all() as { name: string }[]).map((c) => c.name));
  for (const [name, decl] of [
    ['brand_keywords', 'TEXT'],
    ['brand_handles', 'TEXT'],
    ['exclude_terms', 'TEXT'],
    ['mentions_analyzed_at', 'TEXT'],
  ] as const) {
    if (!orgCols.has(name)) db.exec(`ALTER TABLE org_profiles ADD COLUMN ${name} ${decl}`);
  }

  // Basic/Pro/Max tier migration — subscriptions used to be a modules[] cart;
  // plan_tier is now the source of truth (modules_json is derived from it, see
  // src/lib/subscription/server-store.ts). Backfill any pre-tier rows to the
  // smallest tier that's a superset of their existing modules, so nobody loses
  // access on migration — and rewrite modules_json to that tier's canonical set
  // so the two columns never disagree (hasModule() reads modules_json, not
  // plan_tier, so a mismatch here would silently deny access the tier grants).
  const subCols = new Set((db.prepare('PRAGMA table_info(subscriptions)').all() as { name: string }[]).map((c) => c.name));
  if (!subCols.has('plan_tier')) {
    db.exec(`ALTER TABLE subscriptions ADD COLUMN plan_tier TEXT`);
    const legacyRows = db.prepare('SELECT user_id, modules_json FROM subscriptions WHERE plan_tier IS NULL').all() as { user_id: string; modules_json: string }[];
    if (legacyRows.length > 0) {
      const update = db.prepare('UPDATE subscriptions SET plan_tier = ?, modules_json = ? WHERE user_id = ?');
      for (const row of legacyRows) {
        let modules: ModuleId[] = [];
        try { modules = JSON.parse(row.modules_json); } catch { /* leave empty */ }
        let tier = inferTierFromModules(modules);
        // The module set alone can under-place an account that already has
        // usage exceeding a smaller tier's caps (e.g. more connected channels
        // than Basic allows) — module inference can't see that, so nudge any
        // account with 2+ modules already active up to 'pro' rather than risk
        // an immediate lockout on migration.
        if (tier === 'basic' && modules.length >= 2) tier = 'pro';
        update.run(tier, JSON.stringify(TIER_MODULES[tier]), row.user_id);
      }
    }
  }

  const seeded = db.prepare("SELECT COUNT(*) as c FROM users WHERE email = 'admin@synq.demo'").get() as { c: number };
  if (seeded.c === 0) {
    seedDemoUser(db);
  }
}

function seedDemoUser(db: Database.Database) {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync('demo-password', salt, 100_000, 64, 'sha512').toString('hex');

  db.prepare(`
    INSERT INTO users (id, name, email, role, pwd_hash, pwd_salt, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run('usr_admin_001', 'SYNQ Admin', 'admin@synq.demo', 'admin', hash, salt, 'Jun 12, 2026');
}

export function verifyPassword(plain: string, hash: string, salt: string): boolean {
  const candidate = pbkdf2Sync(plain, salt, 100_000, 64, 'sha512').toString('hex');
  return candidate === hash;
}

export function getUserByEmail(email: string): (DbUser & { pwd_hash: string; pwd_salt: string }) | undefined {
  const db = getAuthDb();
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as (DbUser & { pwd_hash: string; pwd_salt: string }) | undefined;
}

/* ── Team management (real, persisted) ───────────────────────────────────────── */

function hashPassword(plain: string): { hash: string; salt: string } {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(plain, salt, 100_000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/** All team members, newest first. Excludes password fields. */
export function listUsers(): DbUser[] {
  const db = getAuthDb();
  return db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all() as DbUser[];
}

/** Count active members — the number that counts against the seat limit. */
export function countActiveUsers(): number {
  const db = getAuthDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM users WHERE is_active = 1').get() as { n: number } | undefined;
  return row?.n ?? 0;
}

export function getUserById(id: string): DbUser | undefined {
  const db = getAuthDb();
  return db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(id) as DbUser | undefined;
}

/** Invite (create) a team member. Throws on duplicate email. */
export function createTeamUser(input: { name: string; email: string; password: string; role: 'admin' | 'viewer' }): DbUser {
  const db = getAuthDb();
  const email = input.email.trim().toLowerCase();
  if (getUserByEmail(email)) throw new Error('A user with this email already exists.');
  const { hash, salt } = hashPassword(input.password);
  const id = `usr_${randomBytes(8).toString('hex')}`;
  const created_at = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, role, pwd_hash, pwd_salt, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, input.name.trim(), email, input.role, hash, salt, created_at);
  return { id, name: input.name.trim(), email, role: input.role, is_active: 1, created_at };
}

/** Update a member's name/role/active/password. */
export function updateTeamUser(id: string, data: { name?: string; role?: 'admin' | 'viewer'; is_active?: boolean; password?: string }): DbUser | undefined {
  const db = getAuthDb();
  const existing = getUserById(id);
  if (!existing) return undefined;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (typeof data.name === 'string')      { sets.push('name = ?');      params.push(data.name.trim()); }
  if (data.role === 'admin' || data.role === 'viewer') { sets.push('role = ?'); params.push(data.role); }
  if (typeof data.is_active === 'boolean') { sets.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
  if (data.password) { const { hash, salt } = hashPassword(data.password); sets.push('pwd_hash = ?', 'pwd_salt = ?'); params.push(hash, salt); }
  if (sets.length) { params.push(id); db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params); }
  return getUserById(id);
}

export function deleteTeamUser(id: string): boolean {
  const db = getAuthDb();
  const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return res.changes > 0;
}
