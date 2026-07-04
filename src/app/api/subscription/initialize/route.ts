import { NextRequest, NextResponse } from 'next/server';
import { PLAN_TIERS, TIER_DEFS, type PlanTier } from '@/lib/subscription/tiers';

export async function POST(req: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Paystack not configured' }, { status: 503 });
  }

  try {
    const body = await req.json() as {
      email:    string;
      amount:   number;
      currency: 'NGN' | 'USD';
      planTier: string;
      billing:  string;
    };

    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required to process payment.' }, { status: 400 });
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount.' }, { status: 400 });
    }

    if (!PLAN_TIERS.includes(body.planTier as PlanTier)) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }
    const planTier = body.planTier as PlanTier;

    const paystackBody = {
      email:    body.email,
      amount:   body.amount,
      currency: body.currency,
      metadata: {
        planTier,
        billing:      body.billing,
        custom_fields: [
          { display_name: 'Plan', variable_name: 'plan_tier', value: TIER_DEFS[planTier].name },
          { display_name: 'Billing', variable_name: 'billing', value: body.billing },
        ],
      },
    };

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackBody),
    });

    const data = await res.json() as {
      status:  boolean;
      message: string;
      data?:   { reference: string; access_code: string; authorization_url: string };
    };

    console.log('[subscription/initialize] Paystack response:', JSON.stringify(data));

    if (!data.status || !data.data) {
      return NextResponse.json(
        { error: data.message || 'Failed to initialize payment' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      reference:        data.data.reference,
      accessCode:       data.data.access_code,
      authorizationUrl: data.data.authorization_url,
    });
  } catch (err) {
    console.error('[subscription/initialize] exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
