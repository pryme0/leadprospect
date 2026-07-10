/**
 * Access requests — people who ask to be onboarded via /signup. Stored in the
 * SHARED Postgres and surfaced to the super admin in the platform console. No
 * user account is created; the super admin reaches out and provisions the org.
 */
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { migrateSqliteTable } from '@/lib/pg-migrate';
import { randomBytes } from 'crypto';

export type AccessRequestStatus = 'new' | 'contacted' | 'archived';

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string | null;
  status: AccessRequestStatus;
  created_at: string;
  /** Referral code this person signed up under (referral attribution), if any. */
  referred_by_code: string | null;
}

let ready: Promise<void> | null = null;
async function ensureReady(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await ensureAppSchema();
    await migrateSqliteTable({
      file: 'app.db', table: 'access_requests',
      columns: ['id', 'name', 'email', 'company', 'phone', 'message', 'status', 'created_at'],
      conflict: 'ON CONFLICT (id) DO NOTHING',
    });
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

export async function createAccessRequest(input: { name: string; email: string; company?: string; phone?: string; message?: string; referredByCode?: string }): Promise<AccessRequest> {
  await ensureReady();
  const row: AccessRequest = {
    id: `req_${randomBytes(8).toString('hex')}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    message: input.message?.trim() || null,
    status: 'new',
    created_at: new Date().toISOString(),
    referred_by_code: input.referredByCode?.trim() || null,
  };
  await appPool().query(
    `INSERT INTO access_requests (id, name, email, company, phone, message, status, created_at, referred_by_code)
     VALUES ($1,$2,$3,$4,$5,$6,'new',$7,$8)`,
    [row.id, row.name, row.email, row.company, row.phone, row.message, row.created_at, row.referred_by_code],
  );
  return row;
}

export async function listAccessRequests(status?: AccessRequestStatus): Promise<AccessRequest[]> {
  await ensureReady();
  const r = status
    ? await appPool().query('SELECT * FROM access_requests WHERE status = $1 ORDER BY created_at DESC', [status])
    : await appPool().query('SELECT * FROM access_requests ORDER BY created_at DESC');
  return r.rows as AccessRequest[];
}

export async function countNewRequests(): Promise<number> {
  await ensureReady();
  const r = await appPool().query("SELECT COUNT(*)::int AS n FROM access_requests WHERE status = 'new'");
  return (r.rows[0]?.n as number) ?? 0;
}

export async function updateAccessRequestStatus(id: string, status: AccessRequestStatus): Promise<boolean> {
  await ensureReady();
  const r = await appPool().query('UPDATE access_requests SET status = $1 WHERE id = $2', [status, id]);
  return (r.rowCount ?? 0) > 0;
}
