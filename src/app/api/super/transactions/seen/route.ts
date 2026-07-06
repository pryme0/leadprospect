import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { markAllSeen } from '@/lib/billing/transactions';

export const dynamic = 'force-dynamic';

/** POST /api/super/transactions/seen — clear the unseen (notification) count. */
export async function POST(req: Request) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;
  try {
    await markAllSeen();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/super/transactions/seen]', err);
    return NextResponse.json({ message: 'Failed.' }, { status: 500 });
  }
}
