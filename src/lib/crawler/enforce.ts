/**
 * Crawl enforcement — the physical kill-switch for time-boxed access.
 *
 * The crawler (thelixcrawler) only crawls SBUs whose `sbus.active = true`
 * (listActiveSbus filters on it). The app shares that Postgres, so flipping the
 * flag stops/starts a tenant's background crawling on the next cron tick:
 *   - access expired  → active = false (stop all crawling for the org)
 *   - access restored → active = true  (renewal re-enables crawling)
 *
 * Called when a super-admin grant changes, on the platform dashboard load, and
 * by the /api/super/enforce sweep (cron target).
 */
import { appPool } from '@/lib/app-pg';
import { sbuIdForUser } from './control-client';
import { getOrgAccess } from '@/lib/subscription/server-store';

/**
 * Sync one org's crawler SBU with its access state. Returns the resulting active
 * flag, or null when Postgres isn't configured / the org has no SBU row yet.
 */
export async function enforceOrgAccess(orgId: string): Promise<boolean | null> {
  let pool;
  try { pool = appPool(); } catch { return null; }
  const access = await getOrgAccess(orgId);
  const shouldBeActive = access.active;
  const sbuId = sbuIdForUser(orgId);
  // Only write when the flag actually needs to change.
  await pool.query(
    'UPDATE sbus SET active = $1, updated_at = now() WHERE id = $2 AND active IS DISTINCT FROM $1',
    [shouldBeActive, sbuId],
  );
  return shouldBeActive;
}

/** Sweep the given orgs and sync each SBU. Used by the enforce endpoint + cron. */
export async function enforceOrgs(orgIds: string[]): Promise<{ orgId: string; active: boolean | null }[]> {
  const out: { orgId: string; active: boolean | null }[] = [];
  for (const orgId of orgIds) out.push({ orgId, active: await enforceOrgAccess(orgId) });
  return out;
}
