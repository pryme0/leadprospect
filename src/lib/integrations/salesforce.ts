/**
 * Salesforce live sync — the reference "real" integration.
 * Uses the stored per-user OAuth token to query the REST API, auto-refreshing
 * the access token on 401 and persisting the new one.
 */
import { getConnection, upsertConnection, type IntegrationConnection } from './store';
import { refreshAccessToken } from './oauth';
import { resolveCreds } from './creds';

const API_VERSION = 'v60.0';
const INTEGRATION_ID = 'salesforce';

export interface SalesforceRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  source: string;
  created_at: string;
  type: 'Lead' | 'Contact';
}

interface QueryResult<T> { totalSize: number; done: boolean; records: T[] }

async function sfFetch(userId: string, path: string): Promise<Response> {
  let conn = getConnection(userId, INTEGRATION_ID);
  if (!conn?.access_token || !conn.instance_url) throw new Error('Salesforce is not connected.');

  const doGet = (c: IntegrationConnection) =>
    fetch(`${c.instance_url}${path}`, {
      headers: { Authorization: `Bearer ${c.access_token}`, Accept: 'application/json' },
      cache: 'no-store',
    });

  let res = await doGet(conn);
  if (res.status === 401 && conn.refresh_token) {
    // Access token expired — refresh (with this user's app creds) and retry once.
    const creds = resolveCreds(userId, INTEGRATION_ID);
    if (!creds) throw new Error('Salesforce app credentials are missing — reconnect.');
    const t = await refreshAccessToken(INTEGRATION_ID, conn.refresh_token, creds);
    conn = upsertConnection(userId, INTEGRATION_ID, {
      access_token: t.access_token,
      refresh_token: conn.refresh_token,
      instance_url: t.instance_url ?? conn.instance_url,
      account_label: conn.account_label,
      scopes: conn.scopes,
      extra: conn.extra,
    });
    res = await doGet(conn);
  }
  return res;
}

async function query<T>(userId: string, soql: string): Promise<T[]> {
  const res = await sfFetch(userId, `/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Salesforce query failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as QueryResult<T>;
  return data.records ?? [];
}

interface SfLead { Id: string; Name: string; Email: string | null; Company: string | null; Status: string | null; LeadSource: string | null; CreatedDate: string }
interface SfContact { Id: string; Name: string; Email: string | null; LeadSource: string | null; CreatedDate: string; Account?: { Name?: string } | null }

/** Fetch recent Leads + Contacts from the connected org, normalized for the UI. */
export async function fetchSalesforceRecords(userId: string, limit = 25): Promise<SalesforceRecord[]> {
  const [leads, contacts] = await Promise.all([
    query<SfLead>(userId, `SELECT Id, Name, Email, Company, Status, LeadSource, CreatedDate FROM Lead ORDER BY CreatedDate DESC LIMIT ${limit}`),
    query<SfContact>(userId, `SELECT Id, Name, Email, LeadSource, CreatedDate, Account.Name FROM Contact ORDER BY CreatedDate DESC LIMIT ${limit}`),
  ]);

  const leadRecs: SalesforceRecord[] = leads.map((l) => ({
    id: l.Id, name: l.Name, email: l.Email ?? '', company: l.Company ?? '',
    status: l.Status ?? 'Lead', source: l.LeadSource ?? '', created_at: l.CreatedDate, type: 'Lead',
  }));
  const contactRecs: SalesforceRecord[] = contacts.map((c) => ({
    id: c.Id, name: c.Name, email: c.Email ?? '', company: c.Account?.Name ?? '',
    status: 'Contact', source: c.LeadSource ?? '', created_at: c.CreatedDate, type: 'Contact',
  }));

  return [...leadRecs, ...contactRecs]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

/** Resolve a human label (username / org) for the connected account, via the identity URL. */
export async function fetchSalesforceIdentity(accessToken: string, identityUrl: string): Promise<string | null> {
  try {
    const res = await fetch(identityUrl, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { username?: string; display_name?: string };
    return j.display_name || j.username || null;
  } catch {
    return null;
  }
}
