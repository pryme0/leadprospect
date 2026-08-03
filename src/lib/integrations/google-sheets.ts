/**
 * Google Sheets live sync — mirrors salesforce.ts's pattern: per-user OAuth
 * token from the live connection store, auto-refresh on 401, retry once.
 */
import { getConnection, upsertConnection, type IntegrationConnection } from './store';
import { refreshAccessToken } from './oauth';
import { resolveCreds } from './creds';

const INTEGRATION_ID = 'google-sheets';

export interface SheetRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  source: string;
  created_at: string;
  type: 'Spreadsheet';
}

async function gsFetch(userId: string, url: string): Promise<Response> {
  let conn = await getConnection(userId, INTEGRATION_ID);
  if (!conn?.access_token) throw new Error('Google Sheets is not connected.');

  const doGet = (c: IntegrationConnection) => fetch(url, { headers: { Authorization: `Bearer ${c.access_token}` }, cache: 'no-store' });

  let res = await doGet(conn);
  if (res.status === 401 && conn.refresh_token) {
    const creds = await resolveCreds(userId, INTEGRATION_ID);
    if (!creds) throw new Error('Google app credentials are missing — reconnect.');
    const t = await refreshAccessToken(INTEGRATION_ID, conn.refresh_token, creds);
    conn = await upsertConnection(userId, INTEGRATION_ID, {
      access_token: t.access_token,
      refresh_token: conn.refresh_token,
      account_label: conn.account_label,
      scopes: conn.scopes,
      extra: conn.extra,
    });
    res = await doGet(conn);
  }
  return res;
}

/** List the connected account's Google Sheets spreadsheets, normalized for the UI. */
export async function fetchGoogleSheetsRecords(userId: string, limit = 25): Promise<SheetRecord[]> {
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet'")}&fields=${encodeURIComponent('files(id,name,createdTime)')}&pageSize=${limit}&orderBy=createdTime desc`;
  const res = await gsFetch(userId, url);
  if (!res.ok) throw new Error(`Google Drive request failed (${res.status})`);
  const data = await res.json();
  const files = (data.files ?? []) as { id: string; name: string; createdTime?: string }[];
  return files.map((f) => ({
    id: f.id, name: f.name, email: '', company: '', status: 'Spreadsheet', source: 'Google Sheets',
    created_at: f.createdTime ?? '', type: 'Spreadsheet',
  }));
}

export async function getSheetData(userId: string, spreadsheetId: string, range: string): Promise<{ values: string[][] } | null> {
  const res = await gsFetch(userId, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function appendSheetData(userId: string, spreadsheetId: string, range: string, values: string[][]): Promise<boolean> {
  const conn = await getConnection(userId, INTEGRATION_ID);
  if (!conn?.access_token) return false;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    },
  );
  return res.ok;
}
