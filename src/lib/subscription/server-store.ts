import { getAuthDb } from '@/lib/auth/db';
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

/** Persist a user's entitlement (called after a verified Paystack payment).
 * Modules are DERIVED from the tier (TIER_MODULES) — the tier is the source
 * of truth; modules_json is kept in sync so every existing hasModule()/
 * getUserModules() reader keeps working unchanged. */
export function setUserSubscription(
  userId: string,
  input: { planTier: PlanTier; billing?: string | null; paystackRef?: string | null },
): void {
  const db = getAuthDb();
  const now = new Date().toISOString();
  const modules = TIER_MODULES[input.planTier];
  db.prepare(`
    INSERT INTO subscriptions (user_id, modules_json, plan_tier, billing, paystack_ref, activated_at, updated_at)
    VALUES (@user_id, @modules_json, @plan_tier, @billing, @paystack_ref, @activated_at, @updated_at)
    ON CONFLICT(user_id) DO UPDATE SET
      modules_json = excluded.modules_json,
      plan_tier    = excluded.plan_tier,
      billing      = excluded.billing,
      paystack_ref = excluded.paystack_ref,
      activated_at = excluded.activated_at,
      updated_at   = excluded.updated_at
  `).run({
    user_id: userId,
    modules_json: JSON.stringify(modules),
    plan_tier: input.planTier,
    billing: input.billing ?? null,
    paystack_ref: input.paystackRef ?? null,
    activated_at: now,
    updated_at: now,
  });
}

export function getUserSubscription(userId: string): UserSubscription | null {
  const db = getAuthDb();
  const row = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as Row | undefined;
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
export function getUserModules(userId: string): ModuleId[] {
  return getUserSubscription(userId)?.modules ?? [];
}

/** Convenience: the plan tier a user is on (null if no subscription). */
export function getUserTier(userId: string): PlanTier | null {
  return getUserSubscription(userId)?.planTier ?? null;
}

/** Server-side gate: is this user subscribed to a given module? */
export function hasModule(userId: string, moduleId: ModuleId): boolean {
  return getUserModules(userId).includes(moduleId);
}
