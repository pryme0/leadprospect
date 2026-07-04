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
  basic: { maxConnectedAccounts: 1, maxHighIntentLeadsPerDay: 5, maxMentionsPerDay: 10, seats: 1, crmIntegration: false },
  pro: { maxConnectedAccounts: 5, maxHighIntentLeadsPerDay: 50, maxMentionsPerDay: 200, seats: 5, crmIntegration: true },
  max: { maxConnectedAccounts: 10, maxHighIntentLeadsPerDay: null, maxMentionsPerDay: null, seats: null, crmIntegration: true },
};

export interface TierPricing {
  usd: number;
  ngn: number;
}

/** Basic = ₦25,000/mo, converted at the real mid-market rate on 2026-07-03
 * (₦1,371.80 = $1, CBN/Wise/XE) and rounded to a clean checkout price.
 * Pro = 3× Basic, Max = 5× Basic, per the requested pricing formula. */
export const TIER_PRICING: Record<PlanTier, TierPricing> = {
  basic: { usd: 19, ngn: 25_000 },
  pro: { usd: 57, ngn: 75_000 },
  max: { usd: 95, ngn: 125_000 },
};

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
      '5 HIGH-intent leads / day',
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
      '50 HIGH-intent leads / day',
      'Everything in Basic',
      '5 connected accounts',
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
      'Unlimited HIGH-intent leads',
      'Everything in Pro',
      '10 connected accounts',
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
