import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getReferral, countReferredOrgs, listReferralEvents } from '@/lib/referrals/store';
import { REDEMPTION_CATALOG } from '@/lib/referrals/config';

export const dynamic = 'force-dynamic';

/** GET /api/referrals — the logged-in org's referral link, points, and history. */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  try {
    const ref = await getReferral(user.org);
    const [referredCount, events] = await Promise.all([
      countReferredOrgs(user.org),
      listReferralEvents(user.org, 25),
    ]);
    const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const link = ref.referral_code ? `${base}/signup?ref=${ref.referral_code}` : null;
    const bonusActive = !!ref.bonus_leads_until && new Date(ref.bonus_leads_until).getTime() > Date.now();
    return NextResponse.json({
      code: ref.referral_code,
      link,
      pointsBalance: ref.points_balance,
      pointsEarnedTotal: ref.points_earned_total,
      referredCount,
      activeBonus: bonusActive ? { perDay: ref.bonus_leads_per_day, until: ref.bonus_leads_until } : null,
      catalog: REDEMPTION_CATALOG,
      events,
    });
  } catch (err) {
    console.error('[GET /api/referrals]', err);
    return NextResponse.json({ message: 'Failed to load referrals.' }, { status: 500 });
  }
}
