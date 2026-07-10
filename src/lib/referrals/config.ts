/**
 * Referral economy config — points awarded per referral and the redemption
 * catalog (points → bonus HIGH-intent leads/day for N days). Kept in one place
 * so the numbers are easy to tune without touching the store/route logic.
 */

/** Points the referrer earns when a referred org is created. */
export const POINTS_PER_REFERRAL = 100;

export interface RedemptionOption {
  id: string;
  label: string;
  cost: number;         // points required
  leadsPerDay: number;  // bonus added to the daily HIGH-intent lead cap
  days: number;         // how long the bonus stays active
}

/** What points can be redeemed for. Each redemption REPLACES the active bonus. */
export const REDEMPTION_CATALOG: RedemptionOption[] = [
  { id: 'boost-10-30', label: '+10 leads / day for 30 days', cost: 100, leadsPerDay: 10, days: 30 },
  { id: 'boost-25-30', label: '+25 leads / day for 30 days', cost: 250, leadsPerDay: 25, days: 30 },
  { id: 'boost-50-30', label: '+50 leads / day for 30 days', cost: 500, leadsPerDay: 50, days: 30 },
];

export function findRedemption(id: string): RedemptionOption | undefined {
  return REDEMPTION_CATALOG.find((o) => o.id === id);
}
