import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { TIER_MODULES, type ModuleId, type PlanTier } from './tiers';
import { TRIAL_TIER, TRIAL_WORKING_DAYS, computeTrialValidUntil } from './trial';

export type { ModuleId };

export type GrantKind = 'subscription' | 'credit' | 'trial';

export interface UserSubscription {
  modules: ModuleId[];
  planTier: PlanTier | null;
  billing: string | null;
  paystack_ref: string | null;
  activated_at: string | null;
  updated_at: string;
  /** ISO expiry of the access window; null = ongoing (no expiry). */
  validUntil: string | null;
  grantKind: GrantKind | null;
  grantNote: string | null;
}

interface Row {
  modules_json: string;
  plan_tier: string | null;
  billing: string | null;
  paystack_ref: string | null;
  activated_at: string | null;
  updated_at: string;
  valid_until: string | null;
  grant_kind: string | null;
  grant_note: string | null;
}

/**
 * Persist an org's entitlement. Modules are DERIVED from the tier (TIER_MODULES) —
 * the tier is the source of truth; modules_json is kept in sync so every
 * hasModule()/getUserModules() reader keeps working.
 *
 * `validUntil` sets a time-boxed access window (super-admin credit/trial):
 * null = ongoing subscription. When provided, entitlement is revoked once the
 * window passes (see isExpired / getUserModules).
 */
export async function setUserSubscription(
  userId: string,
  input: {
    planTier: PlanTier;
    billing?: string | null;
    paystackRef?: string | null;
    validUntil?: string | null;
    grantKind?: GrantKind | null;
    grantNote?: string | null;
  },
): Promise<void> {
  await ensureAppSchema();
  const now = new Date().toISOString();
  const modules = TIER_MODULES[input.planTier];
  await appPool().query(
    `INSERT INTO subscriptions (user_id, modules_json, plan_tier, billing, paystack_ref, activated_at, updated_at, valid_until, grant_kind, grant_note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id) DO UPDATE SET
       modules_json = excluded.modules_json,
       plan_tier    = excluded.plan_tier,
       billing      = excluded.billing,
       paystack_ref = excluded.paystack_ref,
       activated_at = excluded.activated_at,
       updated_at   = excluded.updated_at,
       valid_until  = excluded.valid_until,
       grant_kind   = excluded.grant_kind,
       grant_note   = excluded.grant_note`,
    [
      userId, JSON.stringify(modules), input.planTier, input.billing ?? null, input.paystackRef ?? null, now, now,
      input.validUntil ?? null, input.grantKind ?? 'subscription', input.grantNote ?? null,
    ],
  );
}

/**
 * Give an org its free trial (Basic, TRIAL_WORKING_DAYS working days) if it has
 * NO subscription row yet. Idempotent and safe to call repeatedly — it never
 * touches an org that already has any plan/grant (a paid sub, a super-admin
 * grant, or an already-started/expired trial), so it won't reset or re-grant.
 *
 * `startedAt` lets the backfill anchor the window to an existing org's real
 * creation date; new orgs pass nothing (starts now). Returns true if a trial
 * was just granted, false if the org already had a subscription.
 */
export async function ensureTrialForOrg(orgId: string, startedAt?: Date): Promise<boolean> {
  const existing = await getUserSubscription(orgId);
  if (existing) return false; // already has a plan/grant of some kind — leave it
  const validUntil = computeTrialValidUntil(startedAt);
  await setUserSubscription(orgId, {
    planTier: TRIAL_TIER,
    grantKind: 'trial',
    validUntil,
    grantNote: `${TRIAL_WORKING_DAYS}-working-day free trial`,
  });
  return true;
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  await ensureAppSchema();
  const { rows } = await appPool().query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
  const row = rows[0] as Row | undefined;
  if (!row) return null;
  let modules: ModuleId[] = [];
  try { modules = JSON.parse(row.modules_json) as ModuleId[]; } catch { modules = []; }
  return {
    modules,
    planTier: (row.plan_tier as PlanTier | null) ?? null,
    billing: row.billing,
    paystack_ref: row.paystack_ref,
    activated_at: row.activated_at,
    updated_at: row.updated_at,
    validUntil: row.valid_until,
    grantKind: (row.grant_kind as GrantKind | null) ?? null,
    grantNote: row.grant_note,
  };
}

/** Has this access window elapsed? valid_until null = never expires. */
function isExpired(sub: UserSubscription | null): boolean {
  if (!sub || !sub.planTier) return true; // no plan at all = no access
  if (!sub.validUntil) return false;       // ongoing subscription
  return Date.now() > new Date(sub.validUntil).getTime();
}

export interface OrgAccess {
  tier: PlanTier | null;
  modules: ModuleId[];
  billing: string | null;
  validUntil: string | null;
  grantKind: GrantKind | null;
  grantNote: string | null;
  /** Currently entitled (has a plan AND the window hasn't elapsed). */
  active: boolean;
  /** Had a plan/window that has since elapsed. */
  expired: boolean;
}

/** Resolve an org's live access state — the single source of truth for the UI
 *  lockout banner, the super-admin console, and crawl enforcement. */
export async function getOrgAccess(orgId: string): Promise<OrgAccess> {
  const sub = await getUserSubscription(orgId);
  const active = !!sub && !isExpired(sub);
  const expired = !!sub && !!sub.planTier && !active; // had a plan, now lapsed
  return {
    tier: sub?.planTier ?? null,
    modules: sub?.modules ?? [],
    billing: sub?.billing ?? null,
    validUntil: sub?.validUntil ?? null,
    grantKind: sub?.grantKind ?? null,
    grantNote: sub?.grantNote ?? null,
    active,
    expired,
  };
}

/** Convenience: the modules a user is entitled to. Empty when the access window
 *  has elapsed — this alone fails every hasModule() gate on expiry. */
export async function getUserModules(userId: string): Promise<ModuleId[]> {
  const sub = await getUserSubscription(userId);
  return isExpired(sub) ? [] : (sub?.modules ?? []);
}

/** Convenience: the plan tier a user is on. Null once the window has elapsed. */
export async function getUserTier(userId: string): Promise<PlanTier | null> {
  const sub = await getUserSubscription(userId);
  return isExpired(sub) ? null : (sub?.planTier ?? null);
}

/** Server-side gate: is this user subscribed to a given module (and not expired)? */
export async function hasModule(userId: string, moduleId: ModuleId): Promise<boolean> {
  return (await getUserModules(userId)).includes(moduleId);
}
