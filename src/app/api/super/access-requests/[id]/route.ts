import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { updateAccessRequestStatus, type AccessRequestStatus } from '@/lib/access/store';

export const dynamic = 'force-dynamic';

const VALID: AccessRequestStatus[] = ['new', 'contacted', 'archived'];

/** PATCH /api/super/access-requests/:id — update status (mark contacted/archived). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;

  let body: { status?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }
  if (!body.status || !VALID.includes(body.status as AccessRequestStatus)) {
    return NextResponse.json({ message: 'Valid status is required.' }, { status: 400 });
  }
  const ok = updateAccessRequestStatus(params.id, body.status as AccessRequestStatus);
  if (!ok) return NextResponse.json({ message: 'Request not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
