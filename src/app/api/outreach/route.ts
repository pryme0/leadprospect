import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOutreachStatuses } from '@/lib/outreach/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/outreach?leadIds=a,b,c — outreach status for the visible leads, so
 * the Lead Queue can render "Sent / Replied" pills and filter by contact status.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const raw = new URL(req.url).searchParams.get('leadIds') ?? '';
  const leadIds = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500);
  const statuses = await getOutreachStatuses(user.org, leadIds);
  return NextResponse.json({ statuses });
}
