import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { listOrganizations } from '@/lib/super/orgs';
import { createOrgOwner } from '@/lib/auth/db';
import { upsertOrgProfile } from '@/lib/settings/org-store';
import { setUserSubscription, ensureTrialForOrg } from '@/lib/subscription/server-store';
import { TRIAL_TIER, TRIAL_WORKING_DAYS } from '@/lib/subscription/trial';
import { enforceOrgAccess } from '@/lib/crawler/enforce';
import { recordTransaction } from '@/lib/billing/transactions';
import { PLAN_TIERS, type PlanTier } from '@/lib/subscription/tiers';
import { resolveReferrerByCode, setReferredBy, awardReferralPoints } from '@/lib/referrals/store';
import { POINTS_PER_REFERRAL } from '@/lib/referrals/config';

export const dynamic = 'force-dynamic';

/** GET /api/super/orgs — every organization with owner, plan, access + crawling. */
export async function GET(req: Request) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;
  try {
    return NextResponse.json({ orgs: await listOrganizations() });
  } catch (err) {
    console.error('[GET /api/super/orgs]', err);
    return NextResponse.json({ message: 'Failed to load organizations.' }, { status: 500 });
  }
}

/**
 * POST /api/super/orgs — create a new organization.
 * Body: { ownerName, ownerEmail, password, companyName, website?,
 *         grant?: { tier: PlanTier, days?: number } }
 * `grant.days` set → a time-boxed credit; omitted → an ongoing subscription.
 */
export async function POST(req: Request) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;

  let body: {
    ownerName?: string; ownerEmail?: string; password?: string;
    companyName?: string; website?: string;
    grant?: { tier?: string; days?: number };
    referredByCode?: string;
  } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const ownerName = (body.ownerName ?? '').trim();
  const ownerEmail = (body.ownerEmail ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const companyName = (body.companyName ?? '').trim();

  if (!ownerName || !ownerEmail) return NextResponse.json({ message: 'Owner name and email are required.' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) return NextResponse.json({ message: 'Enter a valid owner email.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
  if (!companyName) return NextResponse.json({ message: 'Company name is required.' }, { status: 400 });

  try {
    const owner = await createOrgOwner({ name: ownerName, email: ownerEmail, password });
    await upsertOrgProfile(owner.id, { company_name: companyName, website: (body.website ?? '').trim() });

    // Referral credit: if this org signed up under a referral code, attribute it
    // and award the referrer. Never blocks org creation, and never self-refers.
    const refCode = (body.referredByCode ?? '').trim();
    if (refCode) {
      try {
        const referrerOrgId = await resolveReferrerByCode(refCode);
        if (referrerOrgId && referrerOrgId !== owner.id) {
          await setReferredBy(owner.id, referrerOrgId);
          await awardReferralPoints(referrerOrgId, owner.id, POINTS_PER_REFERRAL, `Referred ${companyName || ownerEmail}`);
        }
      } catch (err) {
        console.error('[POST /api/super/orgs] referral credit failed', err);
      }
    }

    // Initial entitlement. If the super-admin passed an explicit grant, honor it;
    // otherwise every new org gets the default free trial (Basic, 7 working days).
    const tier = body.grant?.tier;
    if (tier && (PLAN_TIERS as string[]).includes(tier)) {
      const days = body.grant?.days;
      const validUntil = days && days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
      const note = validUntil ? `${days}-day ${tier} credit` : `${tier} subscription`;
      await setUserSubscription(owner.id, {
        planTier: tier as PlanTier,
        validUntil,
        grantKind: validUntil ? 'credit' : 'subscription',
        grantNote: note,
      });
      await enforceOrgAccess(owner.id);
      await recordTransaction({ orgId: owner.id, type: 'grant', planTier: tier, status: 'granted', note: `New org · ${note}`, actor: auth.user.email, email: owner.email });
    } else {
      // Default free trial — idempotent (only grants if no plan exists yet).
      const granted = await ensureTrialForOrg(owner.id);
      if (granted) {
        await enforceOrgAccess(owner.id);
        await recordTransaction({ orgId: owner.id, type: 'grant', planTier: TRIAL_TIER, status: 'granted', note: `New org · ${TRIAL_WORKING_DAYS}-working-day free trial`, actor: auth.user.email, email: owner.email });
      }
    }

    return NextResponse.json({
      org: { orgId: owner.id, ownerName: owner.name, ownerEmail: owner.email, companyName },
      credentials: { email: owner.email, password },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create organization.';
    const status = /already exists/i.test(msg) ? 409 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}
