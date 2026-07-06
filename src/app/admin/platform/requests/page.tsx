'use client';

import { useCallback, useEffect, useState } from 'react';

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'archived';
  created_at: string;
}

const VIOLET = '#6D5EF9';
const MINT = '#21F2A6';
const AMBER = '#FFB547';

function authHeaders(json = false): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function StatusBadge({ s }: { s: AccessRequest['status'] }) {
  const map = {
    new: { c: AMBER, label: 'New' },
    contacted: { c: MINT, label: 'Contacted' },
    archived: { c: 'var(--t-fg-35)', label: 'Archived' },
  }[s];
  return <span className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium" style={{ background: `${map.c}14`, borderColor: `${map.c}33`, color: map.c }}>{map.label}</span>;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/super/access-requests', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d: { requests?: AccessRequest[] }) => setRequests(d.requests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: AccessRequest['status']) => {
    await fetch(`/api/super/access-requests/${id}`, { method: 'PATCH', headers: authHeaders(true), body: JSON.stringify({ status }) }).catch(() => {});
    // Notify the sidebar badge to refresh its new-request count.
    window.dispatchEvent(new Event('synq:access-requests-changed'));
    load();
  };

  const newCount = requests.filter((r) => r.status === 'new').length;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: VIOLET }}>Platform</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Access requests</h1>
        <p className="mt-1 text-sm text-white/45">People who asked to be onboarded via the signup page. {newCount > 0 && <span style={{ color: AMBER }}>{newCount} new</span>}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <div className="grid gap-4 border-b px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white/30" style={{ borderColor: 'var(--a-border)', gridTemplateColumns: '1.3fr 1.4fr 1fr 110px 110px 170px' }}>
          <span>Name</span><span>Email</span><span>Company</span><span>Requested</span><span>Status</span><span className="text-right">Actions</span>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">No access requests yet.</div>
        ) : requests.map((r, i) => (
          <div key={r.id} className="grid items-center gap-4 px-6 py-4 hover:bg-white/[0.015]" style={{ gridTemplateColumns: '1.3fr 1.4fr 1fr 110px 110px 170px', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{r.name}</p>
              {r.phone && <p className="truncate text-[11px] text-white/35">{r.phone}</p>}
            </div>
            <a href={`mailto:${r.email}`} className="truncate text-[13px] text-white/70 hover:text-white">{r.email}</a>
            <span className="truncate text-[13px] text-white/60">{r.company ?? '—'}</span>
            <span className="text-[12px] text-white/45">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            <StatusBadge s={r.status} />
            <div className="flex justify-end gap-1.5">
              {r.status !== 'contacted' && <button onClick={() => setStatus(r.id, 'contacted')} className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium" style={{ borderColor: `${MINT}44`, color: MINT }}>Mark contacted</button>}
              {r.status !== 'archived' && <button onClick={() => setStatus(r.id, 'archived')} className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium text-white/50 hover:text-white/80" style={{ borderColor: 'var(--a-border)' }}>Archive</button>}
            </div>
          </div>
        ))}
      </div>

      {requests.some((r) => r.message) && (
        <div className="mt-5 space-y-2">
          {requests.filter((r) => r.message).map((r) => (
            <div key={r.id} className="rounded-xl border px-4 py-3" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
              <p className="text-[12px] text-white/40">{r.name} · {r.email}</p>
              <p className="mt-1 text-[13px] text-white/75">{r.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
