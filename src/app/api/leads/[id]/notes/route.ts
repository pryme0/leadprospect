import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { addNote, getNotesForLead, updateNote, deleteNote } from '@/lib/leads/notes-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ notes: [] });
  }

  const { id: leadId } = await params;
  try {
    const notes = await getNotesForLead(user.org, leadId);
    return NextResponse.json({ notes });
  } catch (err) {
    console.error('[GET /api/leads/[id]/notes]', err);
    return NextResponse.json({ notes: [] });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  const { id: leadId } = await params;
  try {
    const body = await req.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ message: 'Content is required.' }, { status: 400 });
    }
    const note = await addNote(user.org, leadId, user.sub, content);
    return NextResponse.json({ note });
  } catch (err) {
    console.error('[POST /api/leads/[id]/notes]', err);
    return NextResponse.json({ message: 'Failed to add note.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const noteId = body.noteId;
    const content = body.content?.trim();
    if (!noteId || !content) {
      return NextResponse.json({ message: 'noteId and content are required.' }, { status: 400 });
    }
    const note = await updateNote(user.org, noteId, content);
    if (!note) {
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }
    return NextResponse.json({ note });
  } catch (err) {
    console.error('[PATCH /api/leads/[id]/notes]', err);
    return NextResponse.json({ message: 'Failed to update note.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const noteId = req.nextUrl.searchParams.get('noteId');
    if (!noteId) {
      return NextResponse.json({ message: 'noteId is required.' }, { status: 400 });
    }
    const deleted = await deleteNote(user.org, noteId);
    if (!deleted) {
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/leads/[id]/notes]', err);
    return NextResponse.json({ message: 'Failed to delete note.' }, { status: 500 });
  }
}
