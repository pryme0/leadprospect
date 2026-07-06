import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import type { AuthUser } from '@/lib/auth/session';

/**
 * Server-side super-admin gate — the real security boundary for /api/super/*
 * (the client-side route guard is only UX). Returns either the authenticated
 * super-admin user or a ready-to-return error response.
 */
export function requireSuperAdmin(req: Request): { user: AuthUser } | { error: NextResponse } {
  const user = getUserFromRequest(req);
  if (!user) return { error: NextResponse.json({ message: 'Unauthorized.' }, { status: 401 }) };
  if (user.role !== 'superadmin') return { error: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }) };
  return { user };
}
