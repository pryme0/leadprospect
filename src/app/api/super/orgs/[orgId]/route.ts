import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { getUserById } from '@/lib/auth/db';
import { getUserSubscription, setUserSubscription } from '@/lib/subscription/server-store';
import { enforceOrgAccess } from '@/lib/crawler/enforce';
import { PLAN_TIERS, type PlanTier } from '@/lib/subscription/tiers';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/super/orgs/:orgId — change an org's access.
 * Body actions:
 *   { action: 'grant', tier, days? } — days>0 = time-boxed credit; omitted = ongoing subscription
 *   { action: 'suspend' }            — end the access window now (locks the org)
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
      await setUserSubscription(orgId, {
        planTier: tier as PlanTier,
        validUntil,
        grantKind: validUntil ? 'credit' : 'subscription',
        grantNote: validUntil ? `${days}-day ${tier} credit` : `${tier} subscription`,
      });
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
