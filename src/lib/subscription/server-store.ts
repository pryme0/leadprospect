import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { TIER_MODULES, type ModuleId, type PlanTier } from './tiers';

export type { ModuleId };

export interface UserSubscription {
  modules: ModuleId[];
  planTier: PlanTier | null;
  billing: string | null;
  paystack_ref: string | null;
  activated_at: string | null;
  updated_at: string;
}

interface Row {
  modules_json: string;
  plan_tier: string | null;
  billing: string | null;
  paystack_ref: string | null;
  activated_at: string | null;
  updated_at: string;
}

/**
 * Persist a user's entitlement (called after a verified Paystack payment).
 * Stored in the SHARED Postgres so the subscription is the same across local and
 * prod. Modules are DERIVED from the tier (TIER_MODULES) — the tier is the source
 * of truth; modules_json is kept in sync so every hasModule()/getUserModules()
 * reader keeps working.
 */
export async function setUserSubscription(
  userId: string,
  input: { planTier: PlanTier; billing?: string | null; paystackRef?: string | null },
): Promise<void> {
  await ensureAppSchema();
  const now = new Date().toISOString();
  const modules = TIER_MODULES[input.planTier];
  await appPool().query(
    `INSERT INTO subscriptions (user_id, modules_json, plan_tier, billing, paystack_ref, activated_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id) DO UPDATE SET
       modules_json = excluded.modules_json,
       plan_tier    = excluded.plan_tier,
       billing      = excluded.billing,
       paystack_ref = excluded.paystack_ref,
       activated_at = excluded.activated_at,
       updated_at   = excluded.updated_at`,
    [userId, JSON.stringify(modules), input.planTier, input.billing ?? null, input.paystackRef ?? null, now, now],
  );
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
  };
}

/** Convenience: the modules a user is entitled to (empty array if none). */
export async function getUserModules(userId: string): Promise<ModuleId[]> {
  return (await getUserSubscription(userId))?.modules ?? [];
}

/** Convenience: the plan tier a user is on (null if no subscription). */
export async function getUserTier(userId: string): Promise<PlanTier | null> {
  return (await getUserSubscription(userId))?.planTier ?? null;
}

/** Server-side gate: is this user subscribed to a given module? */
export async function hasModule(userId: string, moduleId: ModuleId): Promise<boolean> {
  return (await getUserModules(userId)).includes(moduleId);
}
