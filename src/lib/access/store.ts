/**
 * Access requests — people who ask to be onboarded via /signup. Stored in the
 * app.db SQLite (persisted once a /data volume is mounted) and surfaced to the
 * super admin in the platform console. No user account is created; the super
 * admin reaches out and provisions the org.
 */
import { getAuthDb } from '@/lib/auth/db';
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
}

let ensured = false;
function db() {
  const d = getAuthDb();
  if (!ensured) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        company    TEXT,
        phone      TEXT,
        message    TEXT,
        status     TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL
      );
    `);
    ensured = true;
  }
  return d;
}

export function createAccessRequest(input: { name: string; email: string; company?: string; phone?: string; message?: string }): AccessRequest {
  const d = db();
  const id = `req_${randomBytes(8).toString('hex')}`;
  const created_at = new Date().toISOString();
  const row: AccessRequest = {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    message: input.message?.trim() || null,
    status: 'new',
    created_at,
  };
  d.prepare(`INSERT INTO access_requests (id, name, email, company, phone, message, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'new', ?)`)
    .run(row.id, row.name, row.email, row.company, row.phone, row.message, row.created_at);
  return row;
}

export function listAccessRequests(status?: AccessRequestStatus): AccessRequest[] {
  const d = db();
  return (status
    ? d.prepare('SELECT * FROM access_requests WHERE status = ? ORDER BY created_at DESC').all(status)
    : d.prepare('SELECT * FROM access_requests ORDER BY created_at DESC').all()) as AccessRequest[];
}

export function countNewRequests(): number {
  const r = db().prepare("SELECT COUNT(*) AS n FROM access_requests WHERE status = 'new'").get() as { n: number } | undefined;
  return r?.n ?? 0;
}

export function updateAccessRequestStatus(id: string, status: AccessRequestStatus): boolean {
  return db().prepare('UPDATE access_requests SET status = ? WHERE id = ?').run(status, id).changes > 0;
}
