/**
 * Pipedrive live sync — mirrors salesforce.ts's pattern: per-user OAuth token
 * from the live connection store, auto-refresh on 401, retry once.
 */
import { getConnection, upsertConnection, type IntegrationConnection } from './store';
import { refreshAccessToken } from './oauth';
import { resolveCreds } from './creds';

const INTEGRATION_ID = 'pipedrive';

export interface PipedriveRecord {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  source: string;
  created_at: string;
  type: 'Person' | 'Deal';
}

async function pdFetch(userId: string, path: string): Promise<Response> {
  let conn = await getConnection(userId, INTEGRATION_ID);
  if (!conn?.access_token) throw new Error('Pipedrive is not connected.');
  const domain = (conn.extra?.api_domain as string | undefined) ?? 'api.pipedrive.com';

  const doGet = (c: IntegrationConnection, d: string) =>
    fetch(`https://${d}${path}`, { headers: { Authorization: `Bearer ${c.access_token}` }, cache: 'no-store' });

  let res = await doGet(conn, domain);
  if (res.status === 401 && conn.refresh_token) {
    const creds = await resolveCreds(userId, INTEGRATION_ID);
    if (!creds) throw new Error('Pipedrive app credentials are missing — reconnect.');
    const t = await refreshAccessToken(INTEGRATION_ID, conn.refresh_token, creds);
    conn = await upsertConnection(userId, INTEGRATION_ID, {
      access_token: t.access_token,
      refresh_token: conn.refresh_token,
      account_label: conn.account_label,
      scopes: conn.scopes,
      extra: conn.extra,
    });
    res = await doGet(conn, domain);
  }
  return res;
}

interface PdPerson { id: number; name: string; email?: { value: string }[]; org_id?: { name: string } | null; add_time: string }
interface PdDeal { id: number; title: string; value: number; status: string; add_time: string }

/** Fetch recent Persons + Deals from the connected account, normalized for the UI. */
export async function fetchPipedriveRecords(userId: string, limit = 25): Promise<PipedriveRecord[]> {
  const [personsRes, dealsRes] = await Promise.all([
    pdFetch(userId, `/v1/persons?limit=${limit}&sort=add_time DESC`),
    pdFetch(userId, `/v1/deals?limit=${limit}&sort=add_time DESC`),
  ]);
  if (!personsRes.ok && !dealsRes.ok) {
    throw new Error(`Pipedrive request failed (${personsRes.status}/${dealsRes.status})`);
  }
  const personsJson = personsRes.ok ? await personsRes.json() : { data: [] };
  const dealsJson = dealsRes.ok ? await dealsRes.json() : { data: [] };

  const persons: PipedriveRecord[] = ((personsJson.data ?? []) as PdPerson[]).map((p) => ({
    id: String(p.id), name: p.name, email: p.email?.[0]?.value ?? '', company: p.org_id?.name ?? '',
    status: 'Person', source: 'Pipedrive', created_at: p.add_time, type: 'Person',
  }));
  const deals: PipedriveRecord[] = ((dealsJson.data ?? []) as PdDeal[]).map((d) => ({
    id: String(d.id), name: d.title, email: '', company: '',
    status: d.status, source: 'Pipedrive', created_at: d.add_time, type: 'Deal',
  }));

  return [...persons, ...deals]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

export async function getPipedriveUser(userId: string): Promise<{ id: number; name: string; email: string } | null> {
  const res = await pdFetch(userId, '/v1/users/me');
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}
