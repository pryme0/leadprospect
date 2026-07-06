import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { setUserSubscription, getUserModules, getUserSubscription } from '@/lib/subscription/server-store';
import { PLAN_TIERS, type PlanTier } from '@/lib/subscription/tiers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/subscription/sync — the caller's authoritative subscription from the
 * shared store (Postgres). The client uses this as the source of truth for the
 * sidebar lock state and the subscription page (localStorage is only a cache).
 */
export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
    const sub = await getUserSubscription(user.org);
    return NextResponse.json({
      modules: sub?.modules ?? [],
      planTier: sub?.planTier ?? null,
      billing: sub?.billing ?? null,
    });
  } catch (err) {
    console.error('[GET /api/subscription/sync]', err);
    return NextResponse.json({ modules: [], planTier: null, billing: null });
  }
}

/**
 * POST /api/subscription/sync — mirror the caller's active plan tier (managed
 * client-side after a verified Paystack checkout) into the server store so that
 * server-side entitlement gates (e.g. Lead Intelligence in /api/leads/generate)
 * match what the user has actually subscribed to. Only ever writes the caller's
 * own entitlement.
 */
export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

    const body = (await req.json()) as { planTier?: string; billing?: string | null };
    if (!body.planTier || !PLAN_TIERS.includes(body.planTier as PlanTier)) {
      return NextResponse.json({ message: 'Invalid or missing planTier.' }, { status: 400 });
    }

    await setUserSubscription(user.org, { planTier: body.planTier as PlanTier, billing: body.billing ?? null });
    return NextResponse.json({ ok: true, modules: await getUserModules(user.org) });
  } catch (err) {
    console.error('[POST /api/subscription/sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
