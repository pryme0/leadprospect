import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getUserByEmail, getOrgId } from '@/lib/auth/db';
import { setUserSubscription, getUserModules } from '@/lib/subscription/server-store';
import { recordTransaction } from '@/lib/billing/transactions';
import { PLAN_TIERS, TIER_MODULES, type PlanTier } from '@/lib/subscription/tiers';

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Paystack not configured' }, { status: 503 });
  }

  try {
    const { reference } = await req.json() as { reference: string };
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = await res.json() as {
      status: boolean;
      data?: {
        status: string;
        amount: number;
        currency: string;
        channel?: string;
        paid_at?: string;
        customer?: { email?: string };
        metadata?: { planTier?: string; billing?: string };
      };
    };

    if (!data.status || data.data?.status !== 'success') {
      return NextResponse.json({ verified: false, error: 'Payment not successful' }, { status: 402 });
    }

    const rawTier = data.data.metadata?.planTier;
    if (!rawTier || !PLAN_TIERS.includes(rawTier as PlanTier)) {
      return NextResponse.json({ verified: false, error: 'Missing or invalid plan in payment metadata' }, { status: 400 });
    }
    const planTier = rawTier as PlanTier;
    const billing = data.data.metadata?.billing ?? 'monthly';

    // Persist entitlement server-side so it can be enforced without trusting the
    // browser. Prefer the authenticated user; fall back to the Paystack customer
    // email so a webhook-style call still lands on the right account.
    // Subscriptions are ORGANIZATION-level: resolve the payer to their org so any
    // admin's payment updates the shared workspace plan (not a personal one).
    const tokenUser = getUserFromRequest(req);
    const payerId =
      tokenUser?.sub ??
      (data.data.customer?.email ? getUserByEmail(data.data.customer.email)?.id : undefined);
    const userId = tokenUser?.org ?? (payerId ? getOrgId(payerId) : undefined);

    if (userId) {
      try {
        await setUserSubscription(userId, { planTier, billing, paystackRef: reference });
        // Record the payment in the audit ledger (idempotent on reference).
        await recordTransaction({
          orgId: userId,
          type: 'payment',
          email: data.data.customer?.email ?? null,
          amount: data.data.amount,
          currency: data.data.currency,
          planTier,
          billing,
          reference,
          status: 'success',
          channel: data.data.channel ?? null,
          paidAt: data.data.paid_at ?? null,
        });
      } catch (err) {
        console.error('[subscription/verify] persist failed', err);
      }
    }

    return NextResponse.json({
      verified: true,
      planTier,
      // Modules derived from the tier — the client consumes this directly rather
      // than re-deriving from TIER_MODULES itself, so there's one source of truth.
      modules: userId ? await getUserModules(userId) : TIER_MODULES[planTier],
      billing,
      amount:   data.data.amount,
      currency: data.data.currency,
      persisted: !!userId,
    });
  } catch (err) {
    console.error('[subscription/verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
