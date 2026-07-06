import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { listUsersInOrg, createTeamUser, countActiveUsersInOrg } from '@/lib/auth/db';
import { getUserModules, getUserTier } from '@/lib/subscription/server-store';
import { seatLimitForTier } from '@/lib/subscription/seats';

export const dynamic = 'force-dynamic';

/** Seat usage for an ORGANIZATION, derived from the org's subscription tier and
 * the org's active member count. `limit: null` means unlimited (Max tier) —
 * callers must check for that before comparing against `used`. */
async function seatInfo(orgId: string) {
  const modules = await getUserModules(orgId);
  const tier = await getUserTier(orgId);
  const limit = seatLimitForTier(tier);
  const used = countActiveUsersInOrg(orgId);
  const remaining = limit === null ? null : Math.max(0, limit - used);
  return { modules, tier, limit, used, remaining };
}

/** GET /api/users — team roster + seat usage for the caller's organization. */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const s = await seatInfo(user.org);
  return NextResponse.json({ users: listUsersInOrg(user.org), seats: { used: s.used, limit: s.limit, remaining: s.remaining, modules: s.modules, tier: s.tier } });
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

  // Seat gate — block once the organization is at its plan limit. limit === null
  // means Max tier's unlimited seats, so it never blocks.
  const s = await seatInfo(user.org);
  if (s.limit !== null && s.used >= s.limit) {
    return NextResponse.json(
      { message: `You've used all ${s.limit} seats on your plan. Upgrade to invite more teammates.`, code: 'seat_limit', seats: { used: s.used, limit: s.limit } },
      { status: 402 },
    );
  }

  try {
    // New teammate joins the inviter's organization.
    const created = createTeamUser(user.org, { name, email, password, role });
    const after = await seatInfo(user.org);
    return NextResponse.json({ user: created, seats: { used: after.used, limit: after.limit, remaining: after.remaining } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create user.';
    const status = /already exists/i.test(msg) ? 409 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}
