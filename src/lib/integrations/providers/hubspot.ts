import { getOAuthConnection, upsertOAuthConnection, isTokenExpired } from '../oauth-store';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID ?? '';
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET ?? '';
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI ?? '';

const SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.objects.companies.read',
].join(' ');

export function getHubSpotAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: HUBSPOT_CLIENT_ID,
    redirect_uri: HUBSPOT_REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params}`;
}

export async function exchangeHubSpotCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      code,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot token exchange failed: ${err}`);
  }

  return res.json();
}

export async function refreshHubSpotToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('HubSpot token refresh failed');
  return res.json();
}

async function getValidToken(orgId: string): Promise<string | null> {
  const conn = await getOAuthConnection(orgId, 'hubspot');
  if (!conn) return null;

  if (await isTokenExpired(conn)) {
    if (!conn.refresh_token) return null;
    const tokens = await refreshHubSpotToken(conn.refresh_token);
    await upsertOAuthConnection(orgId, 'hubspot', tokens);
    return tokens.access_token;
  }

  return conn.access_token;
}

export async function getHubSpotAccountInfo(orgId: string): Promise<{ portalId: string; accountType: string; timeZone: string } | null> {
  const token = await getValidToken(orgId);
  if (!token) return null;

  const res = await fetch('https://api.hubapi.com/account-info/v3/details', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function getHubSpotContacts(orgId: string, limit = 100): Promise<{
  results: { id: string; properties: { email?: string; firstname?: string; lastname?: string; phone?: string; company?: string } }[];
} | null> {
  const token = await getValidToken(orgId);
  if (!token) return null;

  const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,phone,company`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function getHubSpotDeals(orgId: string, limit = 100): Promise<{
  results: { id: string; properties: { dealname?: string; amount?: string; dealstage?: string; closedate?: string } }[];
} | null> {
  const token = await getValidToken(orgId);
  if (!token) return null;

  const res = await fetch(`https://api.hubapi.com/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function createHubSpotContact(orgId: string, contact: {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
}): Promise<{ id: string } | null> {
  const token = await getValidToken(orgId);
  if (!token) return null;

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties: contact }),
  });

  if (!res.ok) return null;
  return res.json();
}
