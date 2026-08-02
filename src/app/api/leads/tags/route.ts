import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { createTag, listTags, deleteTag, assignTag, unassignTag } from '@/lib/leads/tags-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ tags: [] });
  }

  try {
    const tags = await listTags(user.org);
    return NextResponse.json({ tags });
  } catch (err) {
    console.error('[GET /api/leads/tags]', err);
    return NextResponse.json({ tags: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const name = body.name?.trim();
      if (!name) return NextResponse.json({ message: 'Name is required.' }, { status: 400 });
      const tag = await createTag(user.org, name, body.color);
      return NextResponse.json({ tag });
    }

    if (action === 'delete') {
      const tagId = body.tagId;
      if (!tagId) return NextResponse.json({ message: 'tagId is required.' }, { status: 400 });
      await deleteTag(user.org, tagId);
      return NextResponse.json({ success: true });
    }

    if (action === 'assign') {
      const { leadId, tagId } = body;
      if (!leadId || !tagId) return NextResponse.json({ message: 'leadId and tagId are required.' }, { status: 400 });
      await assignTag(user.org, leadId, tagId);
      return NextResponse.json({ success: true });
    }

    if (action === 'unassign') {
      const { leadId, tagId } = body;
      if (!leadId || !tagId) return NextResponse.json({ message: 'leadId and tagId are required.' }, { status: 400 });
      await unassignTag(user.org, leadId, tagId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/leads/tags]', err);
    return NextResponse.json({ message: 'Operation failed.' }, { status: 500 });
  }
}
