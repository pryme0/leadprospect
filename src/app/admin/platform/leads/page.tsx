'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';

/* ── Types ──────────────────────────────────────────────────────────────── */
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
  company: string;
  location: string | null;
  urgency: number | null;
  summary: string | null;
}
interface OrgOption { orgId: string; company: string }
interface Stats {
  kpis: { total: number; high: number; medium: number; low: number; withEmail: number; withPhone: number; avgUrgency: number; thisWeek: number; wowPct: number };
  byDay: { date: string; count: number }[];
  bySource: { source: string; count: number }[];
  byIntent: { intent_level: string; count: number }[];
  topOrgs: { company: string; count: number }[];
  sources: string[];
}

/* ── Theme + palette (works in admin dark & light via --a-* vars) ─────────── */
const VIOLET = '#6D5EF9', MINT = '#21F2A6', AMBER = '#FFB547', CYAN = '#18D8FF';
const AXIS = '#94A3B8';                       // slate-400: legible on both themes
const GRID = 'rgba(148,163,184,0.16)';
const INTENT_META: Record<string, { label: string; color: string }> = {
  HIGH_INTENT:   { label: 'High',   color: MINT },
  MEDIUM_INTENT: { label: 'Medium', color: AMBER },
  LOW_INTENT:    { label: 'Low',    color: '#7C8698' },
};
const SOURCE_COLORS = [VIOLET, CYAN, MINT, AMBER, '#FF6B8B', '#A78BFA'];

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
const fmt = (n: number) => n.toLocaleString();
const srcLabel = (s: string) => (s || '').replace(/^\w/, (c) => c.toUpperCase());

const emptyStats: Stats = {
  kpis: { total: 0, high: 0, medium: 0, low: 0, withEmail: 0, withPhone: 0, avgUrgency: 0, thisWeek: 0, wowPct: 0 },
  byDay: [], bySource: [], byIntent: [], topOrgs: [], sources: [],
};

/* ── Small themed primitives ──────────────────────────────────────────────── */
function Card({ children, className = '', pad = 'p-5' }: { children: React.ReactNode; className?: string; pad?: string }) {
  return (
    <div className={`rounded-2xl border ${pad} ${className}`} style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
      {children}
    </div>
  );
}
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-[11px] shadow-lg" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}>
      {label && <p className="mb-0.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? 'var(--a-text-60)' }}>{(p.name ? `${p.name}: ` : '')}{fmt(Number(p.value ?? 0))}</p>
      ))}
    </div>
  );
}

export default function SuperLeadsPage() {
  const [leads, setLeads] = useState<SuperLead[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [org, setOrg] = useState('');
  const [intent, setIntent] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [days, setDays] = useState('');          // '' = all time
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search box (validate on pause, not keystroke).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search]);

  const filterQS = useCallback((extra?: Record<string, string>) => {
    const qs = new URLSearchParams(extra);
    if (org) qs.set('org', org);
    if (intent) qs.set('intent_level', intent);
    if (source) qs.set('source', source);
    if (debouncedSearch) qs.set('q', debouncedSearch);
    if (days) qs.set('days', days);
    return qs;
  }, [org, intent, source, debouncedSearch, days]);

  const load = useCallback(() => {
    setLoading(true);
    const listQS = filterQS({ page: String(page), limit: '25' });
    Promise.all([
      fetch(`/api/super/leads?${listQS}`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : { leads: [] })),
      fetch(`/api/super/leads/stats?${filterQS()}`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : emptyStats)),
    ]).then(([d, s]: [{ leads?: SuperLead[]; orgs?: OrgOption[]; totalPages?: number; total?: number }, Stats]) => {
      setLeads(d.leads ?? []);
      if (d.orgs) setOrgs(d.orgs);
      setTotalPages(d.totalPages ?? 1);
      setTotal(d.total ?? 0);
      setStats(s ?? emptyStats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filterQS, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [org, intent, source, debouncedSearch, days]);

  /* CSV export — gathers up to 1000 rows matching the current filters. */
  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const rows: SuperLead[] = [];
      for (let p = 1; p <= 10; p++) {
        const qs = filterQS({ page: String(p), limit: '100' });
        const d = await fetch(`/api/super/leads?${qs}`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : { leads: [] }));
        rows.push(...(d.leads ?? []));
        if (!d.leads?.length || p >= (d.totalPages ?? 1)) break;
      }
      const head = ['Name', 'Email', 'Phone', 'Company', 'Role / signal', 'Location', 'Source', 'Intent', 'Urgency', 'Date'];
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [head.join(',')].concat(rows.map((l) => [
        l.first_name, l.email, l.phone_number, l.company, l.income_goal || l.timeline_to_start,
        l.location, l.source_tool, INTENT_META[l.intent_level]?.label ?? l.intent_level, l.urgency, l.created_at,
      ].map(esc).join(','))).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `synq-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }, [filterQS]);

  const kpis = stats.kpis;
  const withContact = kpis.withEmail + kpis.withPhone > 0
    ? Math.round(((Math.max(kpis.withEmail, kpis.withPhone)) / Math.max(1, kpis.total)) * 100) : 0;
  const intentPie = useMemo(() => stats.byIntent
    .filter((r) => r.intent_level)
    .map((r) => ({ name: INTENT_META[r.intent_level]?.label ?? r.intent_level, value: r.count, color: INTENT_META[r.intent_level]?.color ?? '#7C8698' })), [stats.byIntent]);

  const inputStyle = { background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' } as React.CSSProperties;
  const selectCls = 'rounded-xl border px-3.5 py-2 text-sm outline-none';
  const cols = '1.4fr 1fr 1.4fr 0.8fr 100px 90px 70px 80px';

  const anyFilter = !!(org || intent || source || debouncedSearch || days);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: VIOLET }}>Platform</p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--a-text)' }}>Leads</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--a-text-50)' }}>Every lead captured across all organizations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px]" style={{ borderColor: 'var(--a-border2)', color: 'var(--a-text-60)' }}>
            <span className="material-symbols-outlined text-[16px]">refresh</span>Refresh
          </button>
          <button onClick={exportCsv} disabled={exporting || total === 0} className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: VIOLET }}>
            <span className="material-symbols-outlined text-[16px]">{exporting ? 'hourglass_top' : 'download'}</span>{exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Total leads" value={fmt(kpis.total)} icon="groups" accent={VIOLET} />
        <Kpi label="High intent" value={fmt(kpis.high)} icon="local_fire_department" accent={MINT}
          sub={kpis.wowPct !== 0 ? `${kpis.wowPct > 0 ? '▲' : '▼'} ${Math.abs(kpis.wowPct)}% vs last week` : 'flat vs last week'}
          subColor={kpis.wowPct >= 0 ? MINT : '#FF6B8B'} />
        <Kpi label="With contact" value={`${withContact}%`} icon="alternate_email" accent={CYAN}
          sub={`${fmt(kpis.withEmail)} email · ${fmt(kpis.withPhone)} phone`} />
        <Kpi label="Avg urgency" value={String(kpis.avgUrgency)} icon="bolt" accent={AMBER} sub="out of 100" />
        <Kpi label="New this week" value={fmt(kpis.thisWeek)} icon="trending_up" accent={VIOLET} />
      </div>

      {/* Analytics */}
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>Leads over time</p>
            <p className="text-[11px]" style={{ color: 'var(--a-text-40)' }}>{days ? `Last ${days} days` : 'Last 30 days'}</p>
          </div>
          <div className="h-[220px]">
            {stats.byDay.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.byDay} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
                  <defs><linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={VIOLET} stopOpacity={0.35} /><stop offset="100%" stopColor={VIOLET} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} minTickGap={24} />
                  <YAxis tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: VIOLET, strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="count" name="Leads" stroke={VIOLET} strokeWidth={2} fill="url(#gLeads)" dot={false} activeDot={{ r: 4, fill: VIOLET }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>Intent breakdown</p>
          <div className="flex h-[220px] items-center">
            {intentPie.length === 0 ? <Empty /> : (
              <>
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={intentPie} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
                      {intentPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-2">
                  {intentPie.map((e) => (
                    <div key={e.name} className="flex items-center gap-2 text-[12px]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                      <span style={{ color: 'var(--a-text-60)' }}>{e.name}</span>
                      <span className="ml-auto font-medium tabular-nums" style={{ color: 'var(--a-text)' }}>{fmt(e.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <MiniBars title="Top sources" data={stats.bySource.map((s, i) => ({ label: srcLabel(s.source), value: s.count, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))} />
        <MiniBars title="Top organizations" data={stats.topOrgs.map((o, i) => ({ label: o.company, value: o.count, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: 'var(--a-text-40)' }}>search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, post…" className={`${selectCls} w-64 pl-9`} style={inputStyle} />
        </div>
        <select value={org} onChange={(e) => setOrg(e.target.value)} className={selectCls} style={inputStyle}>
          <option value="">All organizations</option>
          {orgs.map((o) => <option key={o.orgId} value={o.orgId}>{o.company}</option>)}
        </select>
        <select value={intent} onChange={(e) => setIntent(e.target.value)} className={selectCls} style={inputStyle}>
          <option value="">All intent</option>
          <option value="HIGH_INTENT">High intent</option>
          <option value="MEDIUM_INTENT">Medium intent</option>
          <option value="LOW_INTENT">Low intent</option>
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={selectCls} style={inputStyle}>
          <option value="">All sources</option>
          {stats.sources.map((s) => <option key={s} value={s}>{srcLabel(s)}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-xl border" style={{ borderColor: 'var(--a-border2)' }}>
          {[['', 'All'], ['7', '7d'], ['30', '30d'], ['90', '90d']].map(([v, l]) => (
            <button key={v} onClick={() => setDays(v)} className="px-3 py-2 text-[12px] font-medium" style={{ background: days === v ? VIOLET : 'var(--a-input-bg)', color: days === v ? '#fff' : 'var(--a-text-60)' }}>{l}</button>
          ))}
        </div>
        {anyFilter && (
          <button onClick={() => { setOrg(''); setIntent(''); setSource(''); setSearch(''); setDays(''); }} className="text-[12px] underline" style={{ color: 'var(--a-text-50)' }}>Clear</button>
        )}
        <span className="ml-auto text-[12px]" style={{ color: 'var(--a-text-40)' }}>{fmt(total)} {total === 1 ? 'person' : 'people'}</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <div className="grid gap-4 border-b px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: 'var(--a-border)', gridTemplateColumns: cols, color: 'var(--a-text-30)' }}>
          <span>Contact</span><span>Company</span><span>Signal</span><span>Location</span><span>Source</span><span>Intent</span><span>Urgency</span><span>Date</span>
        </div>
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="grid items-center gap-4 px-5 py-3.5" style={{ gridTemplateColumns: cols, borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
              {[...Array(8)].map((__, j) => <div key={j} className="h-3 animate-pulse rounded" style={{ background: 'var(--a-hover2)', width: j % 3 === 0 ? '80%' : '55%' }} />)}
            </div>
          ))
        ) : leads.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <span className="material-symbols-outlined mb-2 text-4xl" style={{ color: 'var(--a-text-30)' }}>inbox</span>
            <p className="text-sm" style={{ color: 'var(--a-text-50)' }}>{anyFilter ? 'No leads match these filters.' : 'No leads captured yet.'}</p>
          </div>
        ) : leads.map((l, i) => (
          <div key={l.id} className="grid items-center gap-4 px-5 py-3.5 transition-colors" style={{ gridTemplateColumns: cols, borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--a-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium" style={{ color: 'var(--a-text)' }}>{l.first_name || '—'}</p>
              <p className="truncate text-[11px]" style={{ color: 'var(--a-text-40)' }}>{l.email || l.phone_number || 'No contact yet'}</p>
            </div>
            <span className="truncate text-[13px]" style={{ color: 'var(--a-text-70, var(--a-text-80))' }}>{l.company}</span>
            <span className="truncate text-[12px]" style={{ color: 'var(--a-text-50)' }} title={l.summary || undefined}>{l.income_goal || l.summary || l.timeline_to_start || '—'}</span>
            <span className="truncate text-[12px]" style={{ color: 'var(--a-text-50)' }}>{l.location || '—'}</span>
            <span className="truncate text-[12px] capitalize" style={{ color: 'var(--a-text-55, var(--a-text-60))' }}>{srcLabel(l.source_tool)}</span>
            <span>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: INTENT_META[l.intent_level]?.color ?? 'var(--a-text-40)', background: `${(INTENT_META[l.intent_level]?.color ?? '#7C8698')}1f` }}>
                {INTENT_META[l.intent_level]?.label ?? '—'}
              </span>
            </span>
            <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--a-text-60)' }}>{l.urgency ?? '—'}</span>
            <span className="text-[12px] tabular-nums" style={{ color: 'var(--a-text-40)' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px]" style={{ color: 'var(--a-text-40)' }}>Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1.5 text-[12px] disabled:opacity-40" style={{ borderColor: 'var(--a-border2)', color: 'var(--a-text-60)' }}>Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border px-3 py-1.5 text-[12px] disabled:opacity-40" style={{ borderColor: 'var(--a-border2)', color: 'var(--a-text-60)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */
function Kpi({ label, value, icon, accent, sub, subColor }: { label: string; value: string; icon: string; accent: string; sub?: string; subColor?: string }) {
  return (
    <Card pad="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-45, var(--a-text-50))' }}>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}1f`, color: accent }}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </span>
      </div>
      <p className="text-[26px] font-semibold leading-none tabular-nums" style={{ color: 'var(--a-text)' }}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px]" style={{ color: subColor ?? 'var(--a-text-40)' }}>{sub}</p>}
    </Card>
  );
}

function MiniBars({ title, data }: { title: string; data: { label: string; value: number; color: string }[] }) {
  return (
    <Card>
      <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>{title}</p>
      <div className="h-[180px]">
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barCategoryGap={8}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={120} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--a-hover2)' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function Empty() {
  return <div className="flex h-full items-center justify-center text-[12px]" style={{ color: 'var(--a-text-30)' }}>No data yet</div>;
}
