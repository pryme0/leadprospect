import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? 'synq-internal-2026-xk9m';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TokenPayload {
  sub: string;   // user id
  name: string;
  email: string;
  role: string;
  exp: number;   // unix ms expiry
}

export function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const full: TokenPayload = { ...payload, exp: Date.now() + TTL_MS };
  const data = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(data).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) return null;
  } catch {
    return null;
  }
  const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (Date.now() > payload.exp) return null;
  return payload;
}
