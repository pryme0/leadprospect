import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getTagsForLead } from '@/lib/leads/tags-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ tags: [] });
  }

  const { id: leadId } = await params;
  try {
    const tags = await getTagsForLead(user.org, leadId);
    return NextResponse.json({ tags });
  } catch (err) {
    console.error('[GET /api/leads/[id]/tags]', err);
    return NextResponse.json({ tags: [] });
  }
}
