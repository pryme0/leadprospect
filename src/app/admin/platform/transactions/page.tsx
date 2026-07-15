'use client';

import { useCallback, useEffect, useState } from 'react';

interface Txn {
  id: string;
  orgId: string;
  company: string;
  type: 'payment' | 'grant' | 'suspend';
  email: string | null;
  amount: number | null;   // minor units
  currency: string | null;
  planTier: string | null;
  billing: string | null;
  reference: string | null;
  status: string | null;
  channel: string | null;
  note: string | null;
  actor: string | null;
  paidAt: string | null;
  createdAt: string;
}
interface RevenueStat { currency: string; total: number; count: number }

const MINT = '#21F2A6';
const AMBER = '#FFB547';
const VIOLET = '#6D5EF9';
const RED = '#FF7A7A';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toLocaleString()}`;
  }
}

function TypeBadge({ t }: { t: Txn['type'] }) {
  const map = ({
    payment: { c: MINT, label: 'Payment' },
    grant: { c: VIOLET, label: 'Grant' },
    suspend: { c: RED, label: 'Suspend' },
  } as Record<string, { c: string; label: string }>)[t] ?? {
    c: AMBER,
    label: t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : 'Unknown',
  };
  return <span className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium" style={{ background: `${map.c}14`, borderColor: `${map.c}33`, color: map.c }}>{map.label}</span>;
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [stats, setStats] = useState<{ revenue: RevenueStat[]; payments: number; grants: number }>({ revenue: [], payments: 0, grants: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/super/transactions', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { transactions: [], stats: { revenue: [], payments: 0, grants: 0 } }))
      .then((d: { transactions?: Txn[]; stats?: typeof stats }) => { setTxns(d.transactions ?? []); if (d.stats) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Viewing the ledger clears the unseen (notification) count.
    fetch('/api/super/transactions/seen', { method: 'POST', headers: authHeaders() })
      .then(() => window.dispatchEvent(new Event('synq:transactions-seen')))
      .catch(() => {});
  }, [load]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: VIOLET }}>Platform</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Transactions</h1>
        <p className="mt-1 text-sm text-white/45">Payments and manual grants across all organizations — the audit log.</p>
      </div>

      {/* Revenue summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.revenue.length === 0 ? (
          <div className="rounded-2xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
            <p className="text-[11px] uppercase tracking-wider text-white/35">Revenue</p>
            <p className="mt-1 text-2xl font-semibold text-white">—</p>
          </div>
        ) : stats.revenue.map((r) => (
          <div key={r.currency} className="rounded-2xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
            <p className="text-[11px] uppercase tracking-wider text-white/35">Revenue · {r.currency}</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: MINT }}>{money(r.total, r.currency)}</p>
            <p className="text-[11px] text-white/35">{r.count} payment{r.count === 1 ? '' : 's'}</p>
          </div>
        ))}
        <div className="rounded-2xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
          <p className="text-[11px] uppercase tracking-wider text-white/35">Payments</p>
          <p className="mt-1 text-2xl font-semibold text-white">{stats.payments}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
          <p className="text-[11px] uppercase tracking-wider text-white/35">Manual grants</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: AMBER }}>{stats.grants}</p>
        </div>
      </div>

      {/* Ledger */}
      <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <div className="grid gap-4 border-b px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white/30" style={{ borderColor: 'var(--a-border)', gridTemplateColumns: '92px 1.2fr 90px 120px 90px 1fr 90px' }}>
          <span>Date</span><span>Company</span><span>Type</span><span>Amount</span><span>Plan</span><span>Reference / note</span><span>Status</span>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">Loading transactions…</div>
        ) : txns.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">No transactions yet.</div>
        ) : txns.map((t, i) => (
          <div key={t.id} className="grid items-center gap-4 px-6 py-3.5 hover:bg-white/[0.015]" style={{ gridTemplateColumns: '92px 1.2fr 90px 120px 90px 1fr 90px', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
            <span className="text-[12px] text-white/45">{new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">{t.company}</p>
              {t.email && <p className="truncate text-[11px] text-white/35">{t.email}</p>}
            </div>
            <TypeBadge t={t.type} />
            <span className="text-[13px] text-white/80">{t.amount != null && t.currency ? money(t.amount, t.currency) : '—'}</span>
            <span className="text-[13px] capitalize text-white/60">{t.planTier ?? '—'}</span>
            <div className="min-w-0">
              <p className="truncate font-mono text-[11px] text-white/55">{t.reference ?? t.note ?? '—'}</p>
              {t.actor && <p className="truncate text-[10px] text-white/30">by {t.actor}</p>}
            </div>
            <span className="text-[12px] capitalize" style={{ color: t.status === 'success' || t.status === 'granted' ? MINT : t.status === 'suspended' ? RED : 'var(--t-fg-45)' }}>{t.status ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
