import type { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './token';

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
  // Resolve the workspace id from the token claim (issued at login). Users now
  // live in shared Postgres (async), so we no longer do a synchronous DB lookup
  // here — every current token carries `org`. A pre-organization legacy token
  // (no `org`) scopes to the user's own id; a teammate on such a token re-logs
  // in once to pick up their real org.
  const org = payload.org || payload.sub;
  return { ...payload, org };
}
