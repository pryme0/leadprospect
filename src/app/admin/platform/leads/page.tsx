'use client';

import { useCallback, useEffect, useState } from 'react';

interface SuperLead {
  id: string;
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start: string;   // intent category
  income_goal: string;         // enriched role · company
  source_tool: string;
  intent_level: string;
  created_at: string;
  company: string;             // owning organization
}
interface OrgOption { orgId: string; company: string }

const VIOLET = '#6D5EF9';
const MINT = '#21F2A6';
const AMBER = '#FFB547';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const INTENT_COLOR: Record<string, string> = { HIGH_INTENT: MINT, MEDIUM_INTENT: AMBER, LOW_INTENT: 'var(--t-fg-45)' };

export default function SuperLeadsPage() {
  const [leads, setLeads] = useState<SuperLead[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [org, setOrg] = useState('');
  const [intent, setIntent] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '25' });
    if (org) qs.set('org', org);
    if (intent) qs.set('intent_level', intent);
    fetch(`/api/super/leads?${qs.toString()}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((d: { leads?: SuperLead[]; orgs?: OrgOption[]; totalPages?: number; total?: number }) => {
        setLeads(d.leads ?? []);
        if (d.orgs) setOrgs(d.orgs);
        setTotalPages(d.totalPages ?? 1);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [org, intent, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [org, intent]);

  const selectStyle = { background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)' } as React.CSSProperties;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: VIOLET }}>Platform</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Leads</h1>
        <p className="mt-1 text-sm text-white/45">Every lead captured across all organizations. {total > 0 && <span className="text-white/60">{total.toLocaleString()} total</span>}</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2.5">
        <select value={org} onChange={(e) => setOrg(e.target.value)} className="rounded-xl border px-3.5 py-2 text-sm text-white outline-none" style={selectStyle}>
          <option value="">All organizations</option>
          {orgs.map((o) => <option key={o.orgId} value={o.orgId}>{o.company}</option>)}
        </select>
        <select value={intent} onChange={(e) => setIntent(e.target.value)} className="rounded-xl border px-3.5 py-2 text-sm text-white outline-none" style={selectStyle}>
          <option value="">All intent</option>
          <option value="HIGH_INTENT">High intent</option>
          <option value="MEDIUM_INTENT">Medium intent</option>
          <option value="LOW_INTENT">Low intent</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <div className="grid gap-4 border-b px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white/30" style={{ borderColor: 'var(--a-border)', gridTemplateColumns: '1.2fr 1fr 1.2fr 110px 110px 90px' }}>
          <span>Contact</span><span>Company</span><span>Role / signal</span><span>Source</span><span>Intent</span><span>Date</span>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">Loading leads…</div>
        ) : leads.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">No leads found.</div>
        ) : leads.map((l, i) => (
          <div key={l.id} className="grid items-center gap-4 px-6 py-3.5 hover:bg-white/[0.015]" style={{ gridTemplateColumns: '1.2fr 1fr 1.2fr 110px 110px 90px', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">{l.first_name || '—'}</p>
              <p className="truncate text-[11px] text-white/35">{l.email || l.phone_number || '—'}</p>
            </div>
            <span className="truncate text-[13px] text-white/70">{l.company}</span>
            <span className="truncate text-[12px] text-white/50">{l.income_goal || l.timeline_to_start || '—'}</span>
            <span className="truncate text-[12px] capitalize text-white/55">{l.source_tool}</span>
            <span className="text-[12px] font-medium" style={{ color: INTENT_COLOR[l.intent_level] ?? 'var(--t-fg-45)' }}>{(l.intent_level || '').replace('_INTENT', '').toLowerCase() || '—'}</span>
            <span className="text-[12px] text-white/45">{l.created_at ? new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-white/40">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1.5 text-[12px] text-white/60 disabled:opacity-40" style={{ borderColor: 'var(--a-border)' }}>Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border px-3 py-1.5 text-[12px] text-white/60 disabled:opacity-40" style={{ borderColor: 'var(--a-border)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
