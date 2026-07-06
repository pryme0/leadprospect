/**
 * Super-admin organization aggregation — joins the per-org data the platform
 * console needs: owner (SQLite users), company profile + access state (Postgres),
 * member count (SQLite), and crawling on/off (`sbus.active`, Postgres).
 */
import { listOrgOwners, countActiveUsersInOrg } from '@/lib/auth/db';
import { getOrgAccess, type GrantKind } from '@/lib/subscription/server-store';
import { getOrgProfile } from '@/lib/settings/org-store';
import { appPool } from '@/lib/app-pg';
import { sbuIdForUser } from '@/lib/crawler/control-client';
import type { PlanTier } from '@/lib/subscription/tiers';

export interface OrgSummary {
  orgId: string;
  ownerName: string;
  ownerEmail: string;
  companyName: string | null;
  website: string | null;
  members: number;
  tier: PlanTier | null;
  grantKind: GrantKind | null;
  validUntil: string | null;
  active: boolean;
  expired: boolean;
  /** Crawler SBU active flag: true/false when the org has an SBU, null when it
   *  has never been provisioned. */
  crawlingActive: boolean | null;
}

export async function listOrganizations(): Promise<OrgSummary[]> {
  const owners = listOrgOwners();

  // Fetch all SBU active flags in one query.
  const sbuActive = new Map<string, boolean>();
  try {
    const ids = owners.map((o) => sbuIdForUser(o.id));
    if (ids.length) {
      const { rows } = await appPool().query('SELECT id, active FROM sbus WHERE id = ANY($1)', [ids]);
      for (const r of rows as { id: string; active: boolean }[]) sbuActive.set(r.id, r.active);
    }
  } catch { /* crawler DB not reachable — leave crawling status unknown */ }

  const out: OrgSummary[] = [];
  for (const o of owners) {
    const [profile, access] = await Promise.all([getOrgProfile(o.id), getOrgAccess(o.id)]);
    const sbuId = sbuIdForUser(o.id);
    out.push({
      orgId: o.id,
      ownerName: o.name,
      ownerEmail: o.email,
      companyName: profile?.company_name ?? null,
      website: profile?.website ?? null,
      members: countActiveUsersInOrg(o.id),
      tier: access.tier,
      grantKind: access.grantKind,
      validUntil: access.validUntil,
      active: access.active,
      expired: access.expired,
      crawlingActive: sbuActive.has(sbuId) ? sbuActive.get(sbuId)! : null,
    });
  }
  return out;
}
