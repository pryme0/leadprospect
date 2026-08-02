import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { createTemplate, listTemplates, updateTemplate, deleteTemplate } from '@/lib/outreach/templates-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const templates = await listTemplates(user.org);
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('[GET /api/outreach/templates]', err);
    return NextResponse.json({ templates: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'comms'))) {
    return NextResponse.json({ message: 'Outreach module not enabled.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, subject, content, category } = body;

    if (!name?.trim() || !content?.trim()) {
      return NextResponse.json({ message: 'Name and content are required.' }, { status: 400 });
    }

    const template = await createTemplate(user.org, name, content, category ?? 'general', subject);
    return NextResponse.json({ template });
  } catch (err) {
    console.error('[POST /api/outreach/templates]', err);
    return NextResponse.json({ message: 'Failed to create template.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, name, subject, content, category } = body;

    if (!id) {
      return NextResponse.json({ message: 'Template ID is required.' }, { status: 400 });
    }

    const template = await updateTemplate(user.org, id, {
      name,
      subject,
      body: content,
      category,
    });

    if (!template) {
      return NextResponse.json({ message: 'Template not found.' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    console.error('[PATCH /api/outreach/templates]', err);
    return NextResponse.json({ message: 'Failed to update template.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: 'Template ID is required.' }, { status: 400 });
    }

    const deleted = await deleteTemplate(user.org, id);
    if (!deleted) {
      return NextResponse.json({ message: 'Template not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/outreach/templates]', err);
    return NextResponse.json({ message: 'Failed to delete template.' }, { status: 500 });
  }
}
