/**
 * Team seat limits derived from a user's subscription tier.
 *
 * Seats are a fixed allowance per tier (TIER_LIMITS[tier].seats), not the old
 * à-la-carte "+3 per module" formula. `null` means unlimited (Max tier).
 *
 * Pure + dependency-free so it can be imported from both client and server.
 */
import { TIER_LIMITS, TIER_DEFS, type PlanTier } from './tiers';

/** Total seats a workspace is entitled to, given its tier. null = unlimited. */
export function seatLimitForTier(tier: PlanTier | null | undefined): number | null {
  if (!tier) return TIER_LIMITS.basic.seats;
  return TIER_LIMITS[tier].seats;
}

/** A short human label for the current seat tier (shown on the Team page). */
export function seatPlanLabel(tier: PlanTier | null | undefined): string {
  if (!tier) return 'Basic';
  return TIER_DEFS[tier].name;
}

/** Upsell copy: the next tier up and the seat count it unlocks (null tier = already unlimited). */
export function nextSeatStep(tier: PlanTier | null | undefined): { nextTier: PlanTier | null; nextLimit: number | null } {
  const order: PlanTier[] = ['basic', 'pro', 'max'];
  const idx = tier ? order.indexOf(tier) : -1;
  if (idx === -1 || idx === order.length - 1) return { nextTier: null, nextLimit: null };
  const next = order[idx + 1];
  return { nextTier: next, nextLimit: TIER_LIMITS[next].seats };
}
