import type { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './token';

/**
 * Resolve the logged-in user from an API request's `Authorization: Bearer <token>`
 * header. Returns the verified token payload (`sub` = user id) or null when the
 * header is missing / the token is invalid or expired.
 *
 * This is the single server-side "who is this user" helper — every protected
 * API route should use it instead of re-parsing the header inline.
 */
export function getUserFromRequest(req: NextRequest | Request): TokenPayload | null {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  return verifyToken(token);
}
