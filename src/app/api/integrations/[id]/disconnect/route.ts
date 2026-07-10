import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { deleteConnection } from '@/lib/integrations/store';

export const dynamic = 'force-dynamic';

/** POST /api/integrations/:id/disconnect — remove the logged-in user's connection. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const removed = await deleteConnection(user.org, params.id);
  return NextResponse.json({ ok: true, removed });
}
