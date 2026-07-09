import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { getUserById } from '@/lib/auth/db';
import { getUserSubscription, setUserSubscription } from '@/lib/subscription/server-store';
import { enforceOrgAccess } from '@/lib/crawler/enforce';
import { recordTransaction } from '@/lib/billing/transactions';
import { PLAN_TIERS, type PlanTier } from '@/lib/subscription/tiers';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/super/orgs/:orgId — change an org's access.
 * Body actions:
 *   { action: 'grant', tier, days? } — days>0 = time-boxed credit; omitted = ongoing subscription
 *   { action: 'suspend' }            — end the access window now (locks the org)
 *   { action: 'reactivate' }         — restore a suspended/expired org to an ongoing subscription
 * Each syncs the crawler kill-switch via enforceOrgAccess.
 */
export async function PATCH(req: Request, { params }: { params: { orgId: string } }) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;

  const orgId = params.orgId;
  const owner = getUserById(orgId);
  if (!owner || owner.org_id !== orgId) return NextResponse.json({ message: 'Organization not found.' }, { status: 404 });

  let body: { action?: string; tier?: string; days?: number } = {};
  try { body = await req.json(); } catch { /* no body */ }

  try {
    if (body.action === 'grant') {
      const tier = body.tier;
      if (!tier || !(PLAN_TIERS as string[]).includes(tier)) {
        return NextResponse.json({ message: 'Valid tier is required.' }, { status: 400 });
      }
      const days = body.days;
      const validUntil = days && days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
      const note = validUntil ? `${days}-day ${tier} credit` : `${tier} subscription`;
      await setUserSubscription(orgId, {
        planTier: tier as PlanTier,
        validUntil,
        grantKind: validUntil ? 'credit' : 'subscription',
        grantNote: note,
      });
      await recordTransaction({ orgId, type: 'grant', planTier: tier, status: 'granted', note, actor: auth.user.email, email: owner.email });
    } else if (body.action === 'suspend') {
      const current = await getUserSubscription(orgId);
      if (!current?.planTier) return NextResponse.json({ message: 'Nothing to suspend — no active plan.' }, { status: 400 });
      // End the window now → org becomes expired (locked, crawling stops).
      await setUserSubscription(orgId, {
        planTier: current.planTier,
        validUntil: new Date(Date.now() - 1000).toISOString(),
        grantKind: current.grantKind ?? 'subscription',
        grantNote: 'Suspended by super admin',
      });
      await recordTransaction({ orgId, type: 'suspend', planTier: current.planTier, status: 'suspended', note: 'Suspended by super admin', actor: auth.user.email, email: owner.email });
    } else if (body.action === 'reactivate') {
      const current = await getUserSubscription(orgId);
      if (!current?.planTier) return NextResponse.json({ message: 'Nothing to reactivate — no plan on record. Use Assign instead.' }, { status: 400 });
      // Clear the expiry set by suspend → org is active again as an ongoing
      // subscription on its existing tier. (For a time-boxed window, use Assign.)
      await setUserSubscription(orgId, {
        planTier: current.planTier,
        validUntil: null,
        grantKind: 'subscription',
        grantNote: 'Reactivated by super admin',
      });
      await recordTransaction({ orgId, type: 'reactivate', planTier: current.planTier, status: 'reactivated', note: 'Reactivated by super admin', actor: auth.user.email, email: owner.email });
    } else {
      return NextResponse.json({ message: 'Unknown action.' }, { status: 400 });
    }

    const crawling = await enforceOrgAccess(orgId);
    return NextResponse.json({ ok: true, crawlingActive: crawling });
  } catch (err) {
    console.error('[PATCH /api/super/orgs/:orgId]', err);
    return NextResponse.json({ message: 'Failed to update organization.' }, { status: 500 });
  }
}
