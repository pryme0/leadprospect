import type { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './token';
import { getOrgId } from './db';

/**
 * The authenticated caller. `sub` = the individual user id (identity — use it
 * for role checks and self-guards). `org` = the workspace/organization id
 * (= the owner's user id — use it to SCOPE all shared data so teammates see one
 * workspace). `org` is always resolved: from the token when present, else from
 * the users table, else the user's own id.
 */
export interface AuthUser extends TokenPayload {
  org: string;
}

/**
 * Resolve the logged-in user from an API request's `Authorization: Bearer <token>`
 * header. Returns `{ ...payload, org }` or null when the header is missing / the
 * token is invalid or expired.
 *
 * This is the single server-side "who is this user" helper — every protected
 * API route should use it instead of re-parsing the header inline.
 */
export function getUserFromRequest(req: NextRequest | Request): AuthUser | null {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  const payload = verifyToken(token);
  if (!payload) return null;
  // Resolve the workspace id — token claim first (fast), then the DB (so old
  // tokens issued before organizations still scope correctly, no re-login).
  const org = payload.org || getOrgId(payload.sub) || payload.sub;
  return { ...payload, org };
}
