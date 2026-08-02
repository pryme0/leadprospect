import { getOAuthConnection, upsertOAuthConnection, isTokenExpired } from '../oauth-store';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? '';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      code,
    }),
  });

  if (!res.ok) throw new Error('Google token exchange failed');
  return res.json();
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('Google token refresh failed');
  return res.json();
}

async function getValidToken(orgId: string): Promise<string | null> {
  const conn = await getOAuthConnection(orgId, 'google');
  if (!conn) return null;

  if (await isTokenExpired(conn)) {
    if (!conn.refresh_token) return null;
    const tokens = await refreshGoogleToken(conn.refresh_token);
    await upsertOAuthConnection(orgId, 'google', { ...tokens, refresh_token: conn.refresh_token });
    return tokens.access_token;
  }

  return conn.access_token;
}

export async function getGoogleUserInfo(accessToken: string): Promise<{ id: string; email: string; name: string } | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function listGoogleSheets(orgId: string): Promise<{
  files: { id: string; name: string }[];
} | null> {
  const token = await getValidToken(orgId);
  if (!token) return null;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) return null;
  return res.json();
}

export async function getSheetData(orgId: string, spreadsheetId: string, range: string): Promise<{
  values: string[][];
} | null> {
  const token = await getValidToken(orgId);
  if (!token) return null;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) return null;
  return res.json();
}

export async function appendSheetData(orgId: string, spreadsheetId: string, range: string, values: string[][]): Promise<boolean> {
  const token = await getValidToken(orgId);
  if (!token) return false;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    },
  );

  return res.ok;
}
