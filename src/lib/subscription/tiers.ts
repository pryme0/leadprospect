/**
 * Canonical plan-tier config — single source of truth for pricing, feature
 * grants, and usage caps. Pure (no DB imports) so it's safe to import from
 * both server routes and 'use client' pages (e.g. admin/subscription/page.tsx).
 */

/** The four feature bundles a tier can grant. Canonical definition — both
 * the client subscription store and the server subscription store import
 * this rather than declaring their own copy. */
export type ModuleId = 'leads' | 'comms' | 'email' | 'routing';

export type PlanTier = 'basic' | 'pro' | 'max';

export const PLAN_TIERS: PlanTier[] = ['basic', 'pro', 'max'];

/** Which modules a tier grants. Tiers are additive (each includes the one before). */
export const TIER_MODULES: Record<PlanTier, ModuleId[]> = {
  basic: ['leads', 'comms'],
  pro: ['leads', 'comms', 'email'],
  max: ['leads', 'comms', 'email', 'routing'],
};

export interface TierLimits {
  /** null = unlimited */
  maxConnectedAccounts: number | null;
  maxHighIntentLeadsPerDay: number | null;
  maxMentionsPerDay: number | null;
  seats: number | null;
  crmIntegration: boolean;
}

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  basic: { maxConnectedAccounts: 1, maxHighIntentLeadsPerDay: 10, maxMentionsPerDay: 10, seats: 1, crmIntegration: false },
  pro: { maxConnectedAccounts: 3, maxHighIntentLeadsPerDay: 20, maxMentionsPerDay: 200, seats: 5, crmIntegration: true },
  max: { maxConnectedAccounts: 5, maxHighIntentLeadsPerDay: 40, maxMentionsPerDay: null, seats: null, crmIntegration: true },
};

export interface TierPricing {
  usd: number;
  ngn: number;
}

/** Base pricing (₦1,371.80 = $1 mid-market rate, CBN/Wise/XE), then a flat
 * +$5.50 connected-account surcharge added to every tier — in both currencies
 * (≈ ₦7,500 at that rate) — to cover the per-account provider cost (Unipile).
 *   Basic $19 + $5.50 = $24.50  ·  ₦25,000 + ₦7,500 = ₦32,500
 *   Pro   $57 + $5.50 = $62.50  ·  ₦75,000 + ₦7,500 = ₦82,500
 *   Max   $95 + $5.50 = $100.50 ·  ₦125,000 + ₦7,500 = ₦132,500 */
export const TIER_PRICING: Record<PlanTier, TierPricing> = {
  basic: { usd: 24.5, ngn: 32_500 },
  pro: { usd: 62.5, ngn: 82_500 },
  max: { usd: 100.5, ngn: 132_500 },
};

/** Format a USD price string: whole numbers stay clean ("$62"), fractional
 * amounts show two decimals ("$62.50"). Use anywhere a TIER_PRICING.usd or a
 * derived USD amount is rendered so half-dollar prices don't show as "$62.5". */
export const fmtUSD = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export interface TierDef {
  id: PlanTier;
  name: string;
  tagline: string;
  color: string;
  gradient: string;
  features: string[];
}

export const TIER_DEFS: Record<PlanTier, TierDef> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    tagline: 'Get started with focused lead generation',
    color: '#21F2A6',
    gradient: 'from-emerald-500 to-teal-500',
    features: [
      '10 HIGH-intent leads / day',
      'AI lead scoring & intent signals',
      'Explorer & research, pipeline management',
      '1 connected social/messaging account',
      '10 brand mentions / day',
      'Unified inbox, sentiment analysis',
      '1 team seat',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Scale outreach with automation & CRM sync',
    color: '#6D5EF9',
    gradient: 'from-violet-500 to-indigo-500',
    features: [
      '20 HIGH-intent leads / day',
      'Everything in Basic',
      '3 connected accounts',
      '200 brand mentions / day, AI reply suggestions',
      'Email Desk — AI sequences, A/B testing, deliverability monitor',
      'CRM integration (Salesforce sync)',
      '5 team seats',
    ],
  },
  max: {
    id: 'max',
    name: 'Max',
    tagline: 'Full team automation, unlimited scale',
    color: '#FFB547',
    gradient: 'from-amber-500 to-orange-500',
    features: [
      '30–40 HIGH-intent leads / day',
      'Everything in Pro',
      '5 connected accounts',
      'Unlimited brand mentions',
      'Routing Desk — intelligent assignment, SLA & escalations, workflow automation',
      'Unlimited team seats',
      'Priority support',
    ],
  },
};

/** Best-effort mapping from a legacy modules[] set to a tier — used to backfill
 * pre-tier subscription rows. Picks the smallest tier that is a superset of the
 * modules the account already had, so nobody loses access on migration. */
export function inferTierFromModules(modules: ModuleId[]): PlanTier {
  for (const tier of PLAN_TIERS) {
    if (modules.every((m) => TIER_MODULES[tier].includes(m))) return tier;
  }
  return 'pro';
}
