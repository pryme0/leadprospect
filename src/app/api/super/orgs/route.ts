import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { listOrganizations } from '@/lib/super/orgs';
import { createOrgOwner } from '@/lib/auth/db';
import { upsertOrgProfile } from '@/lib/settings/org-store';
import { setUserSubscription } from '@/lib/subscription/server-store';
import { enforceOrgAccess } from '@/lib/crawler/enforce';
import { PLAN_TIERS, type PlanTier } from '@/lib/subscription/tiers';

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
    const owner = createOrgOwner({ name: ownerName, email: ownerEmail, password });
    await upsertOrgProfile(owner.id, { company_name: companyName, website: (body.website ?? '').trim() });

    // Optional initial grant.
    const tier = body.grant?.tier;
    if (tier && (PLAN_TIERS as string[]).includes(tier)) {
      const days = body.grant?.days;
      const validUntil = days && days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
      await setUserSubscription(owner.id, {
        planTier: tier as PlanTier,
        validUntil,
        grantKind: validUntil ? 'credit' : 'subscription',
        grantNote: validUntil ? `${days}-day ${tier} credit` : `${tier} subscription`,
      });
      await enforceOrgAccess(owner.id);
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
