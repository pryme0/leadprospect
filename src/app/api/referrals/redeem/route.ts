import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { redeemForBonusLeads } from '@/lib/referrals/store';
import { findRedemption } from '@/lib/referrals/config';

export const dynamic = 'force-dynamic';

/** POST /api/referrals/redeem — spend points on a bonus-leads reward. Body: { optionId }. */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  let body: { optionId?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }
  const option = findRedemption((body.optionId ?? '').trim());
  if (!option) return NextResponse.json({ message: 'Unknown reward.' }, { status: 400 });

  try {
    const res = await redeemForBonusLeads(user.org, option);
    if (!res.ok) return NextResponse.json({ message: res.message ?? 'Redemption failed.' }, { status: 400 });
    return NextResponse.json({ ok: true, referral: res.referral });
  } catch (err) {
    console.error('[POST /api/referrals/redeem]', err);
    return NextResponse.json({ message: 'Redemption failed.' }, { status: 500 });
  }
}
