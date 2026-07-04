/**
 * OAuth 2.0 framework + per-provider registry (multi-tenant).
 *
 * Each user brings THEIR OWN provider app (Consumer Key/Secret, etc.), entered on
 * the integrations page and stored per-user (src/lib/integrations/store.ts). The
 * OAuth flow uses those per-user credentials. A platform-wide app in env is
 * supported only as an optional fallback.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? 'synq-internal-2026-xk9m';

export interface CredentialField {
  key: string;                 // 'client_id' | 'client_secret' | 'login_url' | ...
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  optional?: boolean;
  help?: string;
}

export interface OAuthProvider {
  scopes: string[];
  scopeSeparator?: string;
  extraAuthParams?: Record<string, string>;
  urls: (loginUrl?: string) => { authorize: string; token: string };
  fields: CredentialField[];
  /** Env vars for an optional platform-wide fallback app. */
  clientIdEnv: string;
  clientSecretEnv: string;
}

export interface ResolvedCreds { clientId: string; clientSecret: string; loginUrl?: string }

const CLIENT_FIELDS: CredentialField[] = [
  { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Your app client id' },
  { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Your app client secret' },
];

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  salesforce: {
    scopes: ['api', 'refresh_token'],
    clientIdEnv: 'SALESFORCE_CLIENT_ID',
    clientSecretEnv: 'SALESFORCE_CLIENT_SECRET',
    urls: (loginUrl) => {
      const base = (loginUrl || process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com').replace(/\/+$/, '');
      return { authorize: `${base}/services/oauth2/authorize`, token: `${base}/services/oauth2/token` };
    },
    fields: [
      { key: 'client_id', label: 'Consumer Key', type: 'text', placeholder: 'Connected App consumer key' },
      { key: 'client_secret', label: 'Consumer Secret', type: 'password', placeholder: 'Connected App consumer secret' },
      { key: 'login_url', label: 'Login URL', type: 'text', optional: true, placeholder: 'https://login.salesforce.com', help: 'Use https://test.salesforce.com for a sandbox.' },
    ],
  },
  hubspot: {
    scopes: ['crm.objects.contacts.read'],
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
    urls: () => ({ authorize: 'https://app.hubspot.com/oauth/authorize', token: 'https://api.hubapi.com/oauth/v1/token' }),
    fields: CLIENT_FIELDS,
  },
  'google-ads': {
    scopes: ['https://www.googleapis.com/auth/adwords'],
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    urls: () => ({ authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token' }),
    fields: CLIENT_FIELDS,
  },
  'linkedin-ads': {
    scopes: ['r_ads', 'r_ads_reporting'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    urls: () => ({ authorize: 'https://www.linkedin.com/oauth/v2/authorization', token: 'https://www.linkedin.com/oauth/v2/accessToken' }),
    fields: CLIENT_FIELDS,
  },
  'meta-ads': {
    scopes: ['ads_read', 'leads_retrieval'],
    clientIdEnv: 'META_CLIENT_ID',
    clientSecretEnv: 'META_CLIENT_SECRET',
    urls: () => ({ authorize: 'https://www.facebook.com/v19.0/dialog/oauth', token: 'https://graph.facebook.com/v19.0/oauth/access_token' }),
    fields: CLIENT_FIELDS,
  },
};

export function oauthProvider(integrationId: string): OAuthProvider | null {
  return OAUTH_PROVIDERS[integrationId] ?? null;
}
export function isOAuthIntegration(integrationId: string): boolean {
  return integrationId in OAUTH_PROVIDERS;
}
export function credentialFields(integrationId: string): CredentialField[] {
  return oauthProvider(integrationId)?.fields ?? [];
}

/** Platform-wide fallback credentials from env, if configured. */
export function envCredentials(integrationId: string): ResolvedCreds | null {
  const p = oauthProvider(integrationId);
  if (!p) return null;
  const clientId = process.env[p.clientIdEnv];
  const clientSecret = process.env[p.clientSecretEnv];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, loginUrl: process.env.SALESFORCE_LOGIN_URL };
}

export function redirectUri(origin: string, integrationId: string): string {
  return `${origin.replace(/\/+$/, '')}/api/integrations/${integrationId}/callback`;
}

/* ── Signed OAuth state (carries the user id across the provider redirect) ────── */

export interface OAuthState { sub: string; integration: string; exp: number; nonce: string }

export function signState(sub: string, integration: string): string {
  const payload: OAuthState = { sub, integration, exp: Date.now() + 10 * 60_000, nonce: randomBytes(6).toString('hex') };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyState(state: string): OAuthState | null {
  if (!state) return null;
  const dot = state.lastIndexOf('.');
  if (dot === -1) return null;
  const data = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(data).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) return null;
  } catch { return null; }
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString()) as OAuthState;
    if (Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

/* ── Authorize URL + token exchange (per-user creds) ─────────────────────────── */

export function buildAuthorizeUrl(integrationId: string, origin: string, state: string, creds: ResolvedCreds): string | null {
  const p = oauthProvider(integrationId);
  if (!p || !creds.clientId) return null;
  const u = new URL(p.urls(creds.loginUrl).authorize);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', creds.clientId);
  u.searchParams.set('redirect_uri', redirectUri(origin, integrationId));
  u.searchParams.set('scope', p.scopes.join(p.scopeSeparator ?? ' '));
  u.searchParams.set('state', state);
  for (const [k, v] of Object.entries(p.extraAuthParams ?? {})) u.searchParams.set(k, v);
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url?: string;
  id?: string;
  scope?: string;
  [k: string]: unknown;
}

async function tokenRequest(url: string, body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`Token request failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json as TokenResponse;
}

export function exchangeCode(integrationId: string, origin: string, code: string, creds: ResolvedCreds): Promise<TokenResponse> {
  const p = oauthProvider(integrationId);
  if (!p) throw new Error(`No OAuth config for ${integrationId}`);
  return tokenRequest(p.urls(creds.loginUrl).token, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: redirectUri(origin, integrationId),
  }));
}

export function refreshAccessToken(integrationId: string, refreshToken: string, creds: ResolvedCreds): Promise<TokenResponse> {
  const p = oauthProvider(integrationId);
  if (!p) throw new Error(`No OAuth config for ${integrationId}`);
  return tokenRequest(p.urls(creds.loginUrl).token, new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  }));
}
