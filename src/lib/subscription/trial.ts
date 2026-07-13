/**
 * Free-trial rules — every new organization gets a Basic-plan trial of
 * TRIAL_WORKING_DAYS *working* days (Mon–Fri; Saturdays and Sundays don't
 * count), starting at org creation.
 *
 * A trial is structurally just a time-boxed Basic grant:
 *   setUserSubscription(orgId, { planTier: 'basic', grantKind: 'trial', validUntil })
 * where `validUntil` is computed by skipping weekends. Every downstream consumer
 * (getOrgAccess.active/expired, enforcement's sbus.active kill-switch, the sync
 * API, the super-admin list) already flows on validUntil/planTier alone, so
 * expiry + crawl-pause "just work" once the window elapses — see
 * src/lib/subscription/server-store.ts and src/lib/crawler/enforce.ts.
 *
 * All date math is done in UTC to stay consistent with the rest of the codebase
 * (validUntil is compared against Date.now() everywhere).
 */
import type { PlanTier } from './tiers';

export const TRIAL_TIER: PlanTier = 'basic';
export const TRIAL_WORKING_DAYS = 7;

/** True for Saturday (6) or Sunday (0) in UTC. */
function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Add N working days to `from`, skipping weekends. The trial "ends" at the end
 * of the Nth working day, so we advance calendar days one at a time and only
 * decrement the counter on weekdays. Preserves the time-of-day of `from`.
 *
 * Example: created Mon 09:00 with N=7 → the 7 counted weekdays are Mon…next-Tue
 * (skipping the weekend), so validUntil lands on the following Wednesday 09:00.
 */
export function addWorkingDays(from: Date, workingDays: number): Date {
  const d = new Date(from.getTime());
  let remaining = Math.max(0, Math.floor(workingDays));
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d)) remaining -= 1;
  }
  return d;
}

/** ISO `validUntil` for a trial that starts at `startedAt` (default: now). */
export function computeTrialValidUntil(startedAt: Date = new Date()): string {
  return addWorkingDays(startedAt, TRIAL_WORKING_DAYS).toISOString();
}

/**
 * Whole working days between now and `validUntil` (weekends excluded), clamped
 * at >= 0. This is what the countdown shows the user ("N working days left").
 * Counts each weekday strictly after "now" up to and including the day of
 * `validUntil`, so a trial expiring later today reads as its last day (1), and a
 * lapsed trial reads 0.
 */
export function workingDaysRemaining(validUntil: string | null, now: Date = new Date()): number {
  if (!validUntil) return 0;
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime()) || end.getTime() <= now.getTime()) return 0;

  let count = 0;
  // Walk day-by-day from `now` to the end instant, counting weekdays crossed.
  const cursor = new Date(now.getTime());
  while (cursor.getTime() < end.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    // Count the day we just stepped onto if it's a weekday and not past the end.
    const capped = cursor.getTime() <= end.getTime() ? cursor : end;
    if (!isWeekend(capped)) count += 1;
  }
  return count;
}

/** True when a subscription grant represents a free trial. */
export function isTrialGrant(grantKind: string | null | undefined): boolean {
  return grantKind === 'trial';
}
