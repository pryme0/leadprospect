import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getTagsForLeads } from '@/lib/leads/tags-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ tags: {} });
  }

  try {
    const leadIdsParam = req.nextUrl.searchParams.get('leadIds') ?? '';
    const leadIds = leadIdsParam.split(',').filter(Boolean);
    if (leadIds.length === 0) {
      return NextResponse.json({ tags: {} });
    }
    const tags = await getTagsForLeads(user.org, leadIds);
    return NextResponse.json({ tags });
  } catch (err) {
    console.error('[GET /api/leads/tags/batch]', err);
    return NextResponse.json({ tags: {} });
  }
}
