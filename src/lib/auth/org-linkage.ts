/**
 * One-time organization merge.
 *
 * The app used to be single-tenant-per-user. This links every existing user into
 * ONE shared organization (owner = the account that holds the company profile +
 * paid subscription), so teammates share the same workspace instead of each
 * getting an empty one. Runs once (guarded by the stored owner in app_meta);
 * after that, new invites inherit the inviter's org via createTeamUser().
 *
 * OWNER SELECTION (in priority order):
 *   1. ORG_OWNER_EMAIL env — an explicit, deterministic override. Set this on the
 *      deployment to the real primary account; it also lets an admin CORRECT a
 *      wrong owner later (changing it + redeploying re-merges to the new owner).
 *   2. Postgres subscription/profile holder that also exists locally (per-env,
 *      since Postgres is shared but users are per-env).
 *   3. The earliest local admin.
 */
import { getAuthDb, getUserByEmail } from './db';
import { appPool, ensureAppSchema } from '@/lib/app-pg';

let ranThisProcess = false;

async function detectOwner(localUserIds: Set<string>): Promise<string | null> {
  // 1. Explicit override.
  const ownerEmail = process.env.ORG_OWNER_EMAIL?.trim();
  if (ownerEmail) {
    const u = getUserByEmail(ownerEmail);
    if (u && localUserIds.has(u.id)) return u.id;
  }
  // 2. Postgres subscription/profile holder that's a local user (deterministic).
  try {
    const pool = appPool();
    if (pool) {
      await ensureAppSchema();
      const q = await pool.query<{ user_id: string }>(`
        SELECT s.user_id
        FROM subscriptions s
        LEFT JOIN org_profiles p ON p.user_id = s.user_id
        ORDER BY (p.company_name IS NOT NULL AND p.company_name <> '') DESC,
                 CASE s.plan_tier WHEN 'max' THEN 3 WHEN 'pro' THEN 2 ELSE 1 END DESC,
                 s.updated_at ASC, s.user_id ASC`);
      for (const r of q.rows) if (localUserIds.has(r.user_id)) return r.user_id;
      const p2 = await pool.query<{ user_id: string }>(
        `SELECT user_id FROM org_profiles WHERE company_name IS NOT NULL AND company_name <> '' ORDER BY updated_at ASC, user_id ASC`);
      for (const r of p2.rows) if (localUserIds.has(r.user_id)) return r.user_id;
    }
  } catch (err) {
    console.error('[org-linkage] Postgres owner detection failed', err);
  }
  // 3. Earliest local admin.
  const admin = getAuthDb().prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1").get() as { id: string } | undefined;
  return admin?.id ?? null;
}

export async function ensureOrgLinkage(): Promise<void> {
  if (ranThisProcess) return;
  const db = getAuthDb();
  db.exec('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)');
  const stored = (db.prepare("SELECT value FROM app_meta WHERE key = 'org_owner'").get() as { value: string } | undefined)?.value;
  const envForced = !!process.env.ORG_OWNER_EMAIL?.trim();

  const localUserIds = new Set((db.prepare('SELECT id FROM users').all() as { id: string }[]).map((r) => r.id));
  const owner = await detectOwner(localUserIds);

  // Skip if already merged to this owner. Re-merge only when an EXPLICIT env
  // override names a different owner (an intentional admin correction) — never
  // on auto-detection drift, so genuinely-separate orgs are never re-merged.
  if (!owner || (stored && (stored === owner || !envForced))) { ranThisProcess = true; return; }

  db.prepare('UPDATE users SET org_id = ?').run(owner);
  db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('org_owner', ?)").run(owner);
  console.log(`[org-linkage] merged ${localUserIds.size} users into org ${owner}`);
  ranThisProcess = true;
}
