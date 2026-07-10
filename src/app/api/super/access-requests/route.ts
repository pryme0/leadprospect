import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { listAccessRequests, countNewRequests } from '@/lib/access/store';

export const dynamic = 'force-dynamic';

/** GET /api/super/access-requests — all onboarding requests + the new count. */
export async function GET(req: Request) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;
  try {
    return NextResponse.json({ requests: await listAccessRequests(), newCount: await countNewRequests() });
  } catch (err) {
    console.error('[GET /api/super/access-requests]', err);
    return NextResponse.json({ message: 'Failed to load requests.' }, { status: 500 });
  }
}
