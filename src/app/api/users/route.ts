import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { listUsers, createTeamUser, countActiveUsers } from '@/lib/auth/db';
import { getUserModules, getUserTier } from '@/lib/subscription/server-store';
import { seatLimitForTier } from '@/lib/subscription/seats';

export const dynamic = 'force-dynamic';

/** Seat usage for the caller's workspace, derived from their subscription tier.
 * `limit: null` means unlimited (Max tier) — callers must check for that before
 * comparing against `used` (null >= used would misbehave via JS coercion). */
function seatInfo(userId: string) {
  const modules = getUserModules(userId);
  const tier = getUserTier(userId);
  const limit = seatLimitForTier(tier);
  const used = countActiveUsers();
  const remaining = limit === null ? null : Math.max(0, limit - used);
  return { modules, tier, limit, used, remaining };
}

/** GET /api/users — team roster + seat usage. Any authenticated member. */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const s = seatInfo(user.sub);
  return NextResponse.json({ users: listUsers(), seats: { used: s.used, limit: s.limit, remaining: s.remaining, modules: s.modules, tier: s.tier } });
}

/**
 * POST /api/users — invite (create) a team member.
 * Admin-only, and enforced against the workspace seat limit (min 3, +3/module).
 * Body: { name, email, password, role }.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (user.role !== 'admin') {
    return NextResponse.json({ message: 'Only admins can invite team members.' }, { status: 403 });
  }

  let body: { name?: string; email?: string; password?: string; role?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }
  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const role: 'admin' | 'viewer' = body.role === 'admin' ? 'admin' : 'viewer';

  if (!name || !email) return NextResponse.json({ message: 'Name and email are required.' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });

  // Seat gate — block once the workspace is at its plan limit. limit === null
  // means Max tier's unlimited seats, so it never blocks.
  const s = seatInfo(user.sub);
  if (s.limit !== null && s.used >= s.limit) {
    return NextResponse.json(
      { message: `You've used all ${s.limit} seats on your plan. Upgrade to invite more teammates.`, code: 'seat_limit', seats: { used: s.used, limit: s.limit } },
      { status: 402 },
    );
  }

  try {
    const created = createTeamUser({ name, email, password, role });
    const after = seatInfo(user.sub);
    return NextResponse.json({ user: created, seats: { used: after.used, limit: after.limit, remaining: after.remaining } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create user.';
    const status = /already exists/i.test(msg) ? 409 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}
