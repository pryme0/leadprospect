import Database from 'better-sqlite3';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { sqliteFile } from '@/lib/sqlite-path';

/**
 * Authentication store.
 *
 * Users (the login source of truth) live in the SHARED Postgres so an account
 * created in any environment logs in everywhere (local ↔ prod) — see app-pg.ts.
 * The user-facing functions here are therefore async.
 *
 * A per-environment SQLite file (app.db) is still used, but ONLY for the
 * integration OAuth tables (per-env token stores). getAuthDb() returns that
 * handle. Older SQLite copies of users/org_profiles/subscriptions may exist on
 * disk; they are legacy and unused — the one-time migration below copies any
 * SQLite users into Postgres so nothing is lost.
 */

const DB_PATH = sqliteFile('app.db');

let _db: Database.Database | null = null;

/** SQLite handle for the per-env integration tables (NOT users). */
export function getAuthDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  bootstrapSqlite(_db);
  return _db;
}

export type UserRole = 'admin' | 'viewer' | 'superadmin';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  /** The workspace this user belongs to (= the owner's user id). All data is
   *  scoped by this so teammates share one organization. */
  org_id: string;
}

/**
 * Create the per-env integration tables. These key off a user id (a string from
 * the Postgres users table) but carry NO foreign key — users no longer live in
 * SQLite, so a cross-store FK is impossible and unnecessary.
 */
function bootstrapSqlite(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS integration_credentials (
      user_id        TEXT NOT NULL,
      integration_id TEXT NOT NULL,
      client_id      TEXT NOT NULL,
      client_secret  TEXT,
      config_json    TEXT,
      updated_at     TEXT NOT NULL,
      PRIMARY KEY (user_id, integration_id)
    );

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
}

/* ── Password hashing (pure crypto — unchanged scheme so old hashes verify) ───── */

export function verifyPassword(plain: string, hash: string, salt: string): boolean {
  const candidate = pbkdf2Sync(plain, salt, 100_000, 64, 'sha512').toString('hex');
  return candidate === hash;
}

function hashPassword(plain: string): { hash: string; salt: string } {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(plain, salt, 100_000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/* ── Readiness: schema + one-time SQLite→Postgres migration + seeding ──────────── */

const USER_COLS = 'id, name, email, role, is_active, created_at, org_id';

let authReady: Promise<void> | null = null;

/** Ensure the Postgres users table exists, legacy SQLite users are migrated in,
 *  and the demo + super-admin accounts are seeded. Idempotent and cached. */
export function ensureAuthReady(): Promise<void> {
  if (authReady) return authReady;
  authReady = (async () => {
    await ensureAppSchema();
    await migrateSqliteUsers();
    await seedUsers();
  })().catch((err) => {
    authReady = null; // allow retry on next call
    throw err;
  });
  return authReady;
}

/**
 * One-time best-effort copy of any users from a pre-existing local app.db into
 * Postgres. Preserves id / hashes / org_id, so migrated accounts log in with
 * their existing passwords. `ON CONFLICT DO NOTHING` makes it safe to run every
 * boot — once a user is in Postgres it's never touched again.
 */
async function migrateSqliteUsers(): Promise<void> {
  let sq: Database.Database;
  try {
    sq = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  } catch {
    return; // no legacy db → nothing to migrate
  }
  try {
    const hasUsers = sq
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get();
    if (!hasUsers) return;
    const rows = sq
      .prepare('SELECT id, name, email, role, pwd_hash, pwd_salt, is_active, created_at, org_id FROM users')
      .all() as Array<{
        id: string; name: string; email: string; role: string;
        pwd_hash: string; pwd_salt: string; is_active: number; created_at: string; org_id: string | null;
      }>;
    if (rows.length === 0) return;
    const p = appPool();
    let copied = 0;
    for (const r of rows) {
      const res = await p.query(
        `INSERT INTO users (id, name, email, role, pwd_hash, pwd_salt, is_active, created_at, org_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT DO NOTHING`,
        [r.id, r.name, r.email, r.role, r.pwd_hash, r.pwd_salt, r.is_active ?? 1,
         r.created_at ?? new Date().toISOString(), r.org_id ?? r.id],
      );
      copied += res.rowCount ?? 0;
    }
    if (copied > 0) console.log(`[auth-migrate] copied ${copied} SQLite user(s) into Postgres`);
  } catch (err) {
    console.warn('[auth-migrate] skipped:', err instanceof Error ? err.message : err);
  } finally {
    try { sq.close(); } catch { /* ignore */ }
  }
}

/** Default super-admin password when SUPERADMIN_PASSWORD isn't set. */
const DEFAULT_SUPERADMIN_PASSWORD = 'Synq-Super-2026!';

async function seedUsers(): Promise<void> {
  const p = appPool();

  // Demo admin — created once if absent.
  const demo = await p.query("SELECT 1 FROM users WHERE lower(email) = 'admin@synq.demo'");
  if (demo.rowCount === 0) {
    const { hash, salt } = hashPassword('demo-password');
    await p.query(
      `INSERT INTO users (id, name, email, role, pwd_hash, pwd_salt, is_active, created_at, org_id)
       VALUES ($1,$2,$3,'admin',$4,$5,1,$6,$1) ON CONFLICT DO NOTHING`,
      ['usr_admin_001', 'SYNQ Admin', 'admin@synq.demo', hash, salt, 'Jun 12, 2026'],
    );
  }

  // Platform super-admin. SUPERADMIN_PASSWORD is authoritative when set: if the
  // account exists we re-sync its password every boot (reliable reset); when
  // unset we only create it once and never touch an existing one.
  const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@synq.africa').trim().toLowerCase();
  const envPassword = process.env.SUPERADMIN_PASSWORD?.trim() || '';
  const existing = await p.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if ((existing.rowCount ?? 0) > 0) {
    if (envPassword) {
      const { hash, salt } = hashPassword(envPassword);
      await p.query(
        "UPDATE users SET pwd_hash=$1, pwd_salt=$2, role='superadmin', is_active=1 WHERE id=$3",
        [hash, salt, existing.rows[0].id],
      );
    }
    return;
  }
  const { hash, salt } = hashPassword(envPassword || DEFAULT_SUPERADMIN_PASSWORD);
  const id = 'usr_super_001';
  await p.query(
    `INSERT INTO users (id, name, email, role, pwd_hash, pwd_salt, is_active, created_at, org_id)
     VALUES ($1,'Platform Super Admin',$2,'superadmin',$3,$4,1,$5,$1) ON CONFLICT DO NOTHING`,
    [id, email, hash, salt, new Date().toISOString()],
  );
}

/* ── User queries (Postgres, shared across environments) ──────────────────────── */

export async function getUserByEmail(
  email: string,
): Promise<(DbUser & { pwd_hash: string; pwd_salt: string }) | undefined> {
  await ensureAuthReady();
  const r = await appPool().query(
    'SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1',
    [email],
  );
  return r.rows[0] as (DbUser & { pwd_hash: string; pwd_salt: string }) | undefined;
}

/** The workspace/org id a user belongs to (= owner's user id). Falls back to the
 *  user's own id if unset (they're their own org). */
export async function getOrgId(userId: string): Promise<string> {
  await ensureAuthReady();
  const r = await appPool().query('SELECT org_id FROM users WHERE id = $1', [userId]);
  return (r.rows[0]?.org_id as string | null) || userId;
}

/** Reassign a user to an org (used by the one-time cross-org merge). */
export async function setUserOrg(userId: string, orgId: string): Promise<void> {
  await ensureAuthReady();
  await appPool().query('UPDATE users SET org_id = $1 WHERE id = $2', [orgId, userId]);
}

/** All team members in an organization, newest first. Excludes password fields. */
export async function listUsersInOrg(orgId: string): Promise<DbUser[]> {
  await ensureAuthReady();
  const r = await appPool().query(
    `SELECT ${USER_COLS} FROM users WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId],
  );
  return r.rows as DbUser[];
}

/** Count active members in an org — counts against that org's seat limit. */
export async function countActiveUsersInOrg(orgId: string): Promise<number> {
  await ensureAuthReady();
  const r = await appPool().query(
    'SELECT COUNT(*)::int AS n FROM users WHERE is_active = 1 AND org_id = $1',
    [orgId],
  );
  return (r.rows[0]?.n as number) ?? 0;
}

export async function getUserById(id: string): Promise<DbUser | undefined> {
  await ensureAuthReady();
  const r = await appPool().query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  return r.rows[0] as DbUser | undefined;
}

/** Invite (create) a team member into an organization. Throws on duplicate email. */
export async function createTeamUser(
  orgId: string,
  input: { name: string; email: string; password: string; role: 'admin' | 'viewer' },
): Promise<DbUser> {
  await ensureAuthReady();
  const email = input.email.trim().toLowerCase();
  if (await getUserByEmail(email)) throw new Error('A user with this email already exists.');
  const { hash, salt } = hashPassword(input.password);
  const id = `usr_${randomBytes(8).toString('hex')}`;
  const created_at = new Date().toISOString();
  await appPool().query(
    `INSERT INTO users (id, name, email, role, pwd_hash, pwd_salt, is_active, created_at, org_id)
     VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8)`,
    [id, input.name.trim(), email, input.role, hash, salt, created_at, orgId],
  );
  return { id, name: input.name.trim(), email, role: input.role, is_active: 1, created_at, org_id: orgId };
}

/**
 * Found a NEW organization: create an owner user whose `org_id = its own id`
 * (unlike createTeamUser, which joins the caller's org). Owner role is 'admin'.
 */
export async function createOrgOwner(input: { name: string; email: string; password: string }): Promise<DbUser> {
  await ensureAuthReady();
  const email = input.email.trim().toLowerCase();
  if (await getUserByEmail(email)) throw new Error('A user with this email already exists.');
  const { hash, salt } = hashPassword(input.password);
  const id = `usr_${randomBytes(8).toString('hex')}`;
  const created_at = new Date().toISOString();
  await appPool().query(
    `INSERT INTO users (id, name, email, role, pwd_hash, pwd_salt, is_active, created_at, org_id)
     VALUES ($1,$2,$3,'admin',$4,$5,1,$6,$1)`,
    [id, input.name.trim(), email, hash, salt, created_at],
  );
  return { id, name: input.name.trim(), email, role: 'admin', is_active: 1, created_at, org_id: id };
}

/** All organizations = every owner (a user whose id equals its org_id). Super-admin only. */
export async function listOrgOwners(): Promise<DbUser[]> {
  await ensureAuthReady();
  const r = await appPool().query(
    `SELECT ${USER_COLS} FROM users WHERE id = org_id AND role != 'superadmin' ORDER BY created_at DESC`,
  );
  return r.rows as DbUser[];
}

/** Update a member's name/role/active/password. */
export async function updateTeamUser(
  id: string,
  data: { name?: string; role?: 'admin' | 'viewer'; is_active?: boolean; password?: string },
): Promise<DbUser | undefined> {
  await ensureAuthReady();
  const existing = await getUserById(id);
  if (!existing) return undefined;
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (typeof data.name === 'string') { sets.push(`name = $${i++}`); params.push(data.name.trim()); }
  if (data.role === 'admin' || data.role === 'viewer') { sets.push(`role = $${i++}`); params.push(data.role); }
  if (typeof data.is_active === 'boolean') { sets.push(`is_active = $${i++}`); params.push(data.is_active ? 1 : 0); }
  if (data.password) { const { hash, salt } = hashPassword(data.password); sets.push(`pwd_hash = $${i++}`, `pwd_salt = $${i++}`); params.push(hash, salt); }
  if (sets.length) {
    params.push(id);
    await appPool().query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, params);
  }
  return getUserById(id);
}

export async function deleteTeamUser(id: string): Promise<boolean> {
  await ensureAuthReady();
  const r = await appPool().query('DELETE FROM users WHERE id = $1', [id]);
  return (r.rowCount ?? 0) > 0;
}
