import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getTagsForLeads, assignTag, getTagById } from '@/lib/leads/tags-store';
import { fireTagAssignedEvent } from '@/lib/leads/lead-events';

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

/** POST /api/leads/tags/batch — assign one tag to many leads at once. */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.filter((id: unknown) => typeof id === 'string') : [];
    const tagId: string | undefined = typeof body?.tagId === 'string' ? body.tagId : undefined;
    if (leadIds.length === 0 || !tagId) {
      return NextResponse.json({ message: 'leadIds[] and tagId are required.' }, { status: 400 });
    }
    await Promise.all(leadIds.map((leadId) => assignTag(user.org, leadId, tagId)));
    const tag = await getTagById(user.org, tagId);
    if (tag) {
      for (const leadId of leadIds) {
        fireTagAssignedEvent(user.org, leadId, tag.name).catch((err) => console.error('[tags] tag-assigned event dispatch failed', err));
      }
    }
    return NextResponse.json({ success: true, count: leadIds.length });
  } catch (err) {
    console.error('[POST /api/leads/tags/batch]', err);
    return NextResponse.json({ message: 'Failed to assign tag.' }, { status: 500 });
  }
}
