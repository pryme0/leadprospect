import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { updateTeamUser, deleteTeamUser, getUserById } from '@/lib/auth/db';

export const dynamic = 'force-dynamic';

/** PATCH /api/users/:id — update a member's name/role/active state. Admin-only. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ message: 'Only admins can manage team members.' }, { status: 403 });

  const target = await getUserById(params.id);
  if (!target) return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  // Same-org guard: an admin can only manage members of their own organization.
  if (target.org_id !== user.org) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  let body: { name?: string; role?: string; is_active?: boolean; password?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }

  // Guard: don't let an admin lock themselves out (deactivate / demote self).
  if (params.id === user.sub) {
    if (body.is_active === false) return NextResponse.json({ message: 'You cannot deactivate your own account.' }, { status: 400 });
    if (body.role === 'viewer')   return NextResponse.json({ message: 'You cannot remove your own admin access.' }, { status: 400 });
  }
  if (body.password && body.password.length < 8) {
    return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const updated = await updateTeamUser(params.id, {
    name: body.name,
    role: body.role === 'admin' || body.role === 'viewer' ? body.role : undefined,
    is_active: typeof body.is_active === 'boolean' ? body.is_active : undefined,
    password: body.password,
  });
  return NextResponse.json({ user: updated });
}

/** DELETE /api/users/:id — remove a member. Admin-only; can't delete self. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ message: 'Only admins can remove team members.' }, { status: 403 });
  if (params.id === user.sub) return NextResponse.json({ message: 'You cannot remove your own account.' }, { status: 400 });
  // Same-org guard: can only remove members of your own organization.
  const target = await getUserById(params.id);
  if (!target || target.org_id !== user.org) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  const ok = await deleteTeamUser(params.id);
  if (!ok) return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
