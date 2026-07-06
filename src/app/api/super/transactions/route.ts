import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { listTransactions, countUnseen, transactionStats } from '@/lib/billing/transactions';
import { listOrganizations } from '@/lib/super/orgs';

export const dynamic = 'force-dynamic';

/** GET /api/super/transactions — audit log, unseen count (badge), revenue stats. */
export async function GET(req: Request) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const [rows, unseenCount, stats, orgs] = await Promise.all([
      listTransactions(),
      countUnseen(),
      transactionStats(),
      listOrganizations(),
    ]);
    const nameByOrg = new Map(orgs.map((o) => [o.orgId, o.companyName ?? o.ownerEmail]));
    const transactions = rows.map((t) => ({
      id: t.id,
      orgId: t.org_id,
      company: nameByOrg.get(t.org_id) ?? t.org_id,
      type: t.type,
      email: t.email,
      amount: t.amount != null ? Number(t.amount) : null,
      currency: t.currency,
      planTier: t.plan_tier,
      billing: t.billing,
      reference: t.reference,
      status: t.status,
      channel: t.channel,
      note: t.note,
      actor: t.actor,
      paidAt: t.paid_at,
      createdAt: t.created_at,
    }));
    return NextResponse.json({ transactions, unseenCount, stats });
  } catch (err) {
    console.error('[GET /api/super/transactions]', err);
    return NextResponse.json({ message: 'Failed to load transactions.' }, { status: 500 });
  }
}
