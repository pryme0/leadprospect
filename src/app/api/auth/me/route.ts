import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';

export function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.json({
    id:    payload.sub,
    name:  payload.name,
    email: payload.email,
    role:  payload.role,
  });
}
