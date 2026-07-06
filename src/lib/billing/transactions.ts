/**
 * Transactions ledger — append-only record of every Paystack payment and every
 * manual super-admin grant/suspend. Powers the platform audit log + the
 * super-admin payment notification badge. Shared Postgres (appPool).
 */
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import { randomBytes } from 'crypto';

export type TransactionType = 'payment' | 'grant' | 'suspend';

export interface TransactionInput {
  orgId: string;
  type: TransactionType;
  email?: string | null;
  amount?: number | null;      // minor units (kobo/cents)
  currency?: string | null;
  planTier?: string | null;
  billing?: string | null;
  reference?: string | null;   // Paystack ref (payments)
  status?: string | null;
  channel?: string | null;
  note?: string | null;
  actor?: string | null;       // who performed a manual action
  paidAt?: string | null;
}

export interface Transaction extends TransactionInput {
  id: string;
  created_at: string;
  seen: number;
}

/** Record a transaction. Payments are idempotent on `reference`. */
export async function recordTransaction(input: TransactionInput): Promise<void> {
  await ensureAppSchema();
  const id = `txn_${randomBytes(10).toString('hex')}`;
  const created_at = new Date().toISOString();
  await appPool().query(
    `INSERT INTO transactions (id, org_id, type, email, amount, currency, plan_tier, billing, reference, status, channel, note, actor, paid_at, created_at, seen)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0)
     ON CONFLICT (reference) WHERE reference IS NOT NULL DO NOTHING`,
    [
      id, input.orgId, input.type, input.email ?? null, input.amount ?? null, input.currency ?? null,
      input.planTier ?? null, input.billing ?? null, input.reference ?? null, input.status ?? null,
      input.channel ?? null, input.note ?? null, input.actor ?? null, input.paidAt ?? null, created_at,
    ],
  );
}

export interface TransactionRow {
  id: string;
  org_id: string;
  type: TransactionType;
  email: string | null;
  amount: string | null;      // pg returns BIGINT as string
  currency: string | null;
  plan_tier: string | null;
  billing: string | null;
  reference: string | null;
  status: string | null;
  channel: string | null;
  note: string | null;
  actor: string | null;
  paid_at: string | null;
  created_at: string;
  seen: number;
}

export async function listTransactions(limit = 200): Promise<TransactionRow[]> {
  await ensureAppSchema();
  const { rows } = await appPool().query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows as TransactionRow[];
}

export async function countUnseen(): Promise<number> {
  await ensureAppSchema();
  const { rows } = await appPool().query('SELECT COUNT(*)::int AS n FROM transactions WHERE seen = 0');
  return (rows[0]?.n as number) ?? 0;
}

export async function markAllSeen(): Promise<void> {
  await ensureAppSchema();
  await appPool().query('UPDATE transactions SET seen = 1 WHERE seen = 0');
}

export interface RevenueStat { currency: string; total: number; count: number }

/** Total successful-payment revenue grouped by currency (minor units). */
export async function transactionStats(): Promise<{ revenue: RevenueStat[]; payments: number; grants: number }> {
  await ensureAppSchema();
  const [rev, counts] = await Promise.all([
    appPool().query(
      `SELECT currency, COALESCE(SUM(amount),0)::bigint AS total, COUNT(*)::int AS count
       FROM transactions WHERE type = 'payment' AND status = 'success' AND currency IS NOT NULL
       GROUP BY currency ORDER BY total DESC`,
    ),
    appPool().query(
      `SELECT
         COUNT(*) FILTER (WHERE type = 'payment')::int AS payments,
         COUNT(*) FILTER (WHERE type IN ('grant','suspend'))::int AS grants
       FROM transactions`,
    ),
  ]);
  return {
    revenue: (rev.rows as { currency: string; total: string; count: number }[]).map((r) => ({ currency: r.currency, total: Number(r.total), count: r.count })),
    payments: (counts.rows[0]?.payments as number) ?? 0,
    grants: (counts.rows[0]?.grants as number) ?? 0,
  };
}
