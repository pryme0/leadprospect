import type { ModuleId, PlanTier } from './subscription/tiers';

export type { ModuleId };
export type Billing  = 'monthly' | 'annual';

export interface SubscriptionState {
  modules:      ModuleId[];
  planTier?:    PlanTier;
  billing:      Billing;
  activatedAt?: string;
  paystackRef?: string;
}

const KEY = 'synq_subscription';

export function getSubscription(): SubscriptionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SubscriptionState) : null;
  } catch { return null; }
}

export function saveSubscription(state: SubscriptionState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('synq:subscription-changed'));
}

export function clearSubscription(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('synq:subscription-changed'));
}

/* Routes that each module unlocks. CRM/integrations are gated under 'email'
 * (same tier boundary — both unlock at Pro) rather than adding a 5th ModuleId. */
export const MODULE_ROUTES: Record<ModuleId, string[]> = {
  leads:   ['/admin/leads', '/admin/explore', '/admin/pipeline', '/admin/signals', '/admin/signal-ops'],
  comms:   ['/admin/comms'],
  email:   ['/admin/email', '/admin/integrations'],
  routing: ['/admin/outreach'],
};

/* Routes always accessible regardless of subscription */
export const FREE_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/settings',
  '/admin/subscription',
  '/admin/referrals',
];

export function routeRequiresModule(href: string): ModuleId | null {
  for (const [moduleId, routes] of Object.entries(MODULE_ROUTES)) {
    if (routes.includes(href)) return moduleId as ModuleId;
  }
  return null;
}
