import { getOAuthConnection, upsertOAuthConnection, isTokenExpired } from '../oauth-store';

const PIPEDRIVE_CLIENT_ID = process.env.PIPEDRIVE_CLIENT_ID ?? '';
const PIPEDRIVE_CLIENT_SECRET = process.env.PIPEDRIVE_CLIENT_SECRET ?? '';
const PIPEDRIVE_REDIRECT_URI = process.env.PIPEDRIVE_REDIRECT_URI ?? '';

export function getPipedriveAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: PIPEDRIVE_CLIENT_ID,
    redirect_uri: PIPEDRIVE_REDIRECT_URI,
    state,
  });
  return `https://oauth.pipedrive.com/oauth/authorize?${params}`;
}

export async function exchangePipedriveCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  api_domain: string;
}> {
  const res = await fetch('https://oauth.pipedrive.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${PIPEDRIVE_CLIENT_ID}:${PIPEDRIVE_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: PIPEDRIVE_REDIRECT_URI,
      code,
    }),
  });

  if (!res.ok) throw new Error('Pipedrive token exchange failed');
  return res.json();
}

export async function refreshPipedriveToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch('https://oauth.pipedrive.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${PIPEDRIVE_CLIENT_ID}:${PIPEDRIVE_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('Pipedrive token refresh failed');
  return res.json();
}

async function getValidToken(orgId: string): Promise<{ token: string; domain: string } | null> {
  const conn = await getOAuthConnection(orgId, 'pipedrive');
  if (!conn) return null;

  const domain = (conn.raw_data as { api_domain?: string }).api_domain ?? 'api.pipedrive.com';

  if (await isTokenExpired(conn)) {
    if (!conn.refresh_token) return null;
    const tokens = await refreshPipedriveToken(conn.refresh_token);
    await upsertOAuthConnection(orgId, 'pipedrive', tokens);
    return { token: tokens.access_token, domain };
  }

  return { token: conn.access_token, domain };
}

export async function getPipedriveUser(orgId: string): Promise<{ id: number; name: string; email: string; company_id: number } | null> {
  const auth = await getValidToken(orgId);
  if (!auth) return null;

  const res = await fetch(`https://${auth.domain}/v1/users/me`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

export async function getPipedrivePersons(orgId: string, limit = 100): Promise<{
  data: { id: number; name: string; email: { value: string }[]; phone: { value: string }[]; org_id?: { name: string } }[];
} | null> {
  const auth = await getValidToken(orgId);
  if (!auth) return null;

  const res = await fetch(`https://${auth.domain}/v1/persons?limit=${limit}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function getPipedriveDeals(orgId: string, limit = 100): Promise<{
  data: { id: number; title: string; value: number; currency: string; status: string; stage_id: number }[];
} | null> {
  const auth = await getValidToken(orgId);
  if (!auth) return null;

  const res = await fetch(`https://${auth.domain}/v1/deals?limit=${limit}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function createPipedrivePerson(orgId: string, person: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<{ id: number } | null> {
  const auth = await getValidToken(orgId);
  if (!auth) return null;

  const res = await fetch(`https://${auth.domain}/v1/persons`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(person),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}
