/**
 * Super-admin organization aggregation — joins the per-org data the platform
 * console needs: owner (SQLite users), company profile + access state (Postgres),
 * member count (SQLite), and crawling on/off (`sbus.active`, Postgres).
 */
import { listOrgOwners, countActiveUsersInOrg } from '@/lib/auth/db';
import { getOrgAccess, type GrantKind } from '@/lib/subscription/server-store';
import { getOrgProfile, listOrgProfilesLite } from '@/lib/settings/org-store';
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

export interface OrgLeadScope { orgId: string; company: string; sbu: string }

/**
 * Roster of orgs (id, company, crawler SBU) for the cross-org leads/analytics
 * views. Merges the users-table owners with org_profiles, so leads still surface
 * when the users table is sparse (org_profiles carries the company + SBU that
 * leads are keyed on). Deduped by org id.
 */
export async function orgLeadRoster(): Promise<OrgLeadScope[]> {
  const [owners, profiles] = await Promise.all([
    listOrgOwners().catch(() => []),
    listOrgProfilesLite().catch(() => []),
  ]);
  const byId = new Map<string, OrgLeadScope>();
  for (const p of profiles) {
    byId.set(p.user_id, {
      orgId: p.user_id,
      company: p.company_name || p.user_id,
      sbu: p.crawler_sbu_id || sbuIdForUser(p.user_id),
    });
  }
  for (const o of owners) {
    const existing = byId.get(o.id);
    byId.set(o.id, {
      orgId: o.id,
      company: existing && existing.company !== o.id ? existing.company : (o.name || o.email),
      sbu: existing?.sbu || sbuIdForUser(o.id),
    });
  }
  return Array.from(byId.values());
}

export async function listOrganizations(): Promise<OrgSummary[]> {
  const owners = await listOrgOwners();

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
    const [profile, access, members] = await Promise.all([
      getOrgProfile(o.id), getOrgAccess(o.id), countActiveUsersInOrg(o.id),
    ]);
    const sbuId = sbuIdForUser(o.id);
    out.push({
      orgId: o.id,
      ownerName: o.name,
      ownerEmail: o.email,
      companyName: profile?.company_name ?? null,
      website: profile?.website ?? null,
      members,
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
