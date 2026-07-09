/**
 * Optional organization merge — an explicit admin escape hatch.
 *
 * Users now live in the shared Postgres with a correct per-user `org_id`
 * (owners are their own org; invited teammates inherit the inviter's org via
 * createTeamUser). So NO automatic merge is needed or safe — auto-detecting an
 * owner and sweeping every user into it would collapse separate organizations
 * into one.
 *
 * This remains ONLY as a deliberate override: set `ORG_OWNER_EMAIL` to force
 * every non-superadmin user into that owner's org. It was used once historically
 * to fix the old "each user is their own org" bug. It is guarded by a PERSISTENT
 * Postgres flag (`app_meta.org_owner`) so it runs at most once per owner value —
 * unlike the previous SQLite guard, which lived in an ephemeral per-env file and
 * silently re-ran on every redeploy.
 *
 * ⚠️ If your deployment now uses multiple organizations (super-admin created
 * orgs), leave `ORG_OWNER_EMAIL` UNSET — otherwise the one merge would pull all
 * of them into a single workspace.
 */
import { getUserByEmail } from './db';
import { appPool, ensureAppSchema } from '@/lib/app-pg';

let ranThisProcess = false;

export async function ensureOrgLinkage(): Promise<void> {
  if (ranThisProcess) return;
  ranThisProcess = true;

  const ownerEmail = process.env.ORG_OWNER_EMAIL?.trim();
  if (!ownerEmail) return; // no explicit override → safe no-op (per-user org_id is authoritative)

  try {
    await ensureAppSchema();
    const pool = appPool();
    await pool.query('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)');

    const owner = await getUserByEmail(ownerEmail);
    if (!owner) return;

    const stored = (await pool.query("SELECT value FROM app_meta WHERE key = 'org_owner'")).rows[0]?.value;
    if (stored === owner.id) return; // already merged to this owner

    // Never sweep the platform super-admin into an org.
    const res = await pool.query("UPDATE users SET org_id = $1 WHERE role != 'superadmin'", [owner.id]);
    await pool.query(
      `INSERT INTO app_meta (key, value) VALUES ('org_owner', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [owner.id],
    );
    console.log(`[org-linkage] merged ${res.rowCount ?? 0} users into org ${owner.id} (ORG_OWNER_EMAIL=${ownerEmail})`);
  } catch (err) {
    console.error('[org-linkage] failed', err);
  }
}
