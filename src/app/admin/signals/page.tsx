'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface Signal {
  id: string;
  source: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  content: string;
  intent_level: string;
  urgency_score: number;
  pain_points: string[];
  summary: string;
  processed: boolean;
  created_at: string;
}

const INTENT_LEVELS = ['', 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'];
const SOURCES = ['', 'google', 'linkedin', 'instagram', 'tiktok', 'reddit'];
const INTENT_CATEGORIES = [
  '', 'Evaluating Vendor', 'High Fit Account', 'Budget Active', 'Needs Outreach',
  'Existing Customer', 'Not a Prospect', '__null__',
];
const INGESTION_CATEGORIES = [
  '', 'google_ads', 'meta_ads', 'tiktok_ads', 'instagram_ads', 'linkedin_ads',
  'website_form', 'crm_import', 'csv_import', 'social_signal', 'general', '__null__',
];

const prettifyIntentCategory = (v: string) => v === '__null__' ? 'Unclassified' : v;
const prettifyIngestionCategory = (v: string) => {
  if (v === '__null__') return 'Uncategorized';
  return v.split('_').map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
};

const INTENT: Record<string, { label: string; color: string; dimBg: string }> = {
  HIGH_INTENT:   { label: 'High',   color: '#EB4203', dimBg: 'rgba(235,66,3,0.10)'   },
  MEDIUM_INTENT: { label: 'Medium', color: '#FF9C5F', dimBg: 'rgba(255,156,95,0.10)' },
  LOW_INTENT:    { label: 'Low',    color: '#00CEC8', dimBg: 'rgba(0,206,200,0.10)'  },
};
// fallback uses CSS vars so it works in both light and dark modes
const fallbackIntent = { label: 'N/A', color: 'var(--t-fg-30)', dimBg: 'var(--t-fg-05)' };
const getIntent = (level: string | null) => (level && INTENT[level]) || fallbackIntent;

export default function SignalsPage() {
  const theme = useWorkspaceTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters = {
    source: searchParams?.get('source') || '',
    intent_level: searchParams?.get('intent_level') || '',
    intent_category: searchParams?.get('intent_category') || '',
    ingestion_category: searchParams?.get('ingestion_category') || '',
    processed: searchParams?.get('processed') || '',
    has_email: searchParams?.get('has_email') || '',
    automation_sent: searchParams?.get('automation_sent') || '',
    enrichment: searchParams?.get('enrichment') || '',
  };

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params: any = { offset: (page - 1) * 20, limit: 20 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      if (search.trim()) params.q = search.trim();
      const res = await adminApi.getSignals(params);
      setSignals(res.data.signals || res.data.data || []);
      setTotalPages(
        res.data.total_pages || res.data.totalPages || Math.ceil((res.data.total || 0) / 20) || 1,
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message?.toString() || err?.message || 'Failed to load signals';
      setFetchError(Array.isArray(msg) ? msg.join('; ') : msg);
      setSignals([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filters, search]);

  useEffect(() => {
    const id = window.setTimeout(() => fetchSignals(), 300);
    return () => window.clearTimeout(id);
  }, [fetchSignals]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearAll = () => {
    setFilters({
      source: '', intent_level: '', intent_category: '', ingestion_category: '',
      processed: '', has_email: '', automation_sent: '', enrichment: '',
    });
    setSearch('');
    setPage(1);
  };

  const highCount        = signals.filter((s) => s.intent_level === 'HIGH_INTENT').length;
  const pendingCount     = signals.filter((s) => !s.processed).length;
  const contactableCount = signals.filter((s) => s.email || s.phone).length;
  const avgUrgency       = signals.length
    ? Math.round(signals.reduce((n, s) => n + (s.urgency_score || 0), 0) / signals.length)
    : 0;

  const filterSpec = [
    { key: 'source',            label: 'Source',    opts: [{ v: '', l: 'All' }, ...SOURCES.filter(Boolean).map((s) => ({ v: s, l: s }))] },
    { key: 'intent_level',      label: 'Intent',    opts: [{ v: '', l: 'All' }, ...INTENT_LEVELS.filter(Boolean).map((l) => ({ v: l, l: l.replace('_INTENT', '').toLowerCase() }))] },
    { key: 'processed',         label: 'Status',    opts: [{ v: '', l: 'All' }, { v: 'true', l: 'Processed' }, { v: 'false', l: 'Pending' }] },
    { key: 'intent_category',   label: 'Category',  opts: [{ v: '', l: 'All' }, ...INTENT_CATEGORIES.filter(Boolean).map((c) => ({ v: c, l: prettifyIntentCategory(c) }))] },
    { key: 'ingestion_category',label: 'Bucket',    opts: [{ v: '', l: 'All' }, ...INGESTION_CATEGORIES.filter(Boolean).map((c) => ({ v: c, l: prettifyIngestionCategory(c) }))] },
    { key: 'has_email',         label: 'Email',     opts: [{ v: '', l: 'All' }, { v: 'true', l: 'Has email' }, { v: 'false', l: 'No email' }] },
    { key: 'automation_sent',   label: 'Routing',   opts: [{ v: '', l: 'All' }, { v: 'true', l: 'Routed' }, { v: 'false', l: 'Not routed' }] },
    { key: 'enrichment',        label: 'Enrichment',opts: [{ v: '', l: 'All' }, { v: 'enriched', l: 'Enriched' }, { v: 'with_email', l: 'Verified email' }] },
  ] as const;

  const stats = [
    { label: 'Total',       value: signals.length,     suffix: '',    color: theme.accent  },
    { label: 'High intent', value: highCount,           suffix: '',    color: '#EB4203'     },
    { label: 'Pending',     value: pendingCount,        suffix: '',    color: '#FF9C5F'     },
    { label: 'Avg score',   value: avgUrgency,          suffix: '/10', color: '#009B98'     },
  ];

  return (
    <div className="max-w-[1500px] mx-auto space-y-4">

      {/* ── Header ── */}
      <header
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          boxShadow: 'var(--t-card-shadow)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6 p-5 lg:p-6">
          {/* Title */}
          <div>
            <p
              className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em]"
              style={{ color: theme.accent, fontFamily: theme.fontMono }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: theme.accent }}
              />
              04 · Signal intelligence
            </p>
            <h1 className="text-[26px] font-black leading-none tracking-tight text-white">Signal Feed</h1>
            <p className="mt-1.5 text-sm text-white/50">
              Demand events ranked by intent, urgency, and contactability.
            </p>
          </div>

          {/* Stat tiles — dark inset so they read on both light and dark card */}
          <div className="flex flex-wrap gap-2.5">
            {stats.map(({ label, value, suffix, color }) => (
              <div
                key={label}
                className="flex min-w-[88px] flex-col gap-1.5 rounded-xl px-4 py-3"
                style={{
                  background: 'var(--t-fg-05)',
                  border: `1px solid ${color}30`,
                }}
              >
                <p
                  className="text-[8px] font-bold uppercase tracking-[0.28em]"
                  style={{ color, fontFamily: theme.fontMono }}
                >
                  {label}
                </p>
                <p
                  className="text-[26px] font-black leading-none tabular-nums"
                  style={{ color, fontFamily: theme.fontMono }}
                >
                  {value.toLocaleString()}
                  {suffix && <span className="text-xs ml-0.5 opacity-50">{suffix}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Error ── */}
      {fetchError && (
        <div
          className="flex items-start gap-3 px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.22)',
            color: '#fca5a5',
            borderRadius: 'var(--t-radius-sm)',
          }}
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v5M12 16h.01" />
          </svg>
          <span>
            <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ fontFamily: theme.fontMono }}>Error</span>
            {fetchError}
          </span>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search name, email, content, pain points…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 bg-transparent py-0.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
          />
          {search && (
            <span className="text-xs text-white/40" style={{ fontFamily: theme.fontMono }}>
              {signals.length} result{signals.length !== 1 ? 's' : ''}
            </span>
          )}
          {activeFilterCount > 0 && (
            <span
              className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ background: 'var(--t-accent-soft)', color: theme.accent, fontFamily: theme.fontMono }}
            >
              {activeFilterCount} on
            </span>
          )}
          {(search || activeFilterCount > 0) && (
            <button
              onClick={clearAll}
              className="shrink-0 text-[11px] text-white/30 transition-colors hover:text-white/60"
              style={{ fontFamily: theme.fontMono }}
            >
              Clear ×
            </button>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--a-border)' }} />

        <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
          {filterSpec.map(({ key, label, opts }) => {
            const val = filters[key as keyof typeof filters];
            const active = val !== '';
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 transition-all"
                style={{
                  background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-04)',
                  border: `1px solid ${active ? theme.accent + '40' : 'var(--a-border)'}`,
                }}
              >
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.24em]"
                  style={{ fontFamily: theme.fontMono, color: active ? theme.accent : 'var(--t-fg-40)' }}
                >
                  {label}
                </span>
                <span style={{ color: 'var(--t-fg-15)', fontSize: 10, userSelect: 'none' }}>·</span>
                <select
                  value={val}
                  onChange={(e) => handleFilterChange(key, e.target.value)}
                  className="cursor-pointer bg-transparent text-[12px] font-medium capitalize text-white/80 focus:outline-none"
                >
                  {opts.map((o) => (
                    <option key={o.v} value={o.v} className="bg-[#112126]">{o.l}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),284px]">

        {/* Signal table */}
        <div
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Column headers */}
          <div
            className="hidden lg:grid px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/30"
            style={{
              gridTemplateColumns: '104px 196px minmax(0,1fr) 60px 90px 72px',
              borderBottom: '1px solid var(--a-border)',
              background: 'var(--t-fg-03)',
              fontFamily: theme.fontMono,
            }}
          >
            <span>Intent</span>
            <span>Contact</span>
            <span>Signal</span>
            <span className="text-center">Score</span>
            <span>Status</span>
            <span className="text-right">Date</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }}
              />
            </div>
          ) : signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div
                className="mb-2 flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'var(--t-fg-04)', border: '1px solid var(--a-border)' }}
              >
                <svg className="h-5 w-5 text-white/25" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M3 12h3l3-9 6 18 3-9h3" />
                </svg>
              </div>
              <p className="text-sm text-white/30">
                {search ? `No signals match "${search}"` : 'No signals found'}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-white/20" style={{ fontFamily: theme.fontMono }}>
                Try adjusting filters
              </p>
            </div>
          ) : (
            signals.map((signal, i) => (
              <SignalRow
                key={signal.id}
                signal={signal}
                theme={theme}
                isLast={i === signals.length - 1}
                onOpen={() => router.push(`/admin/signals/${signal.id}`)}
              />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid var(--a-border)', background: 'var(--t-fg-02)' }}
            >
              <p className="text-[11px] tabular-nums text-white/30" style={{ fontFamily: theme.fontMono }}>
                Page {page} / {totalPages}
                {search && ` · ${signals.length} result${signals.length !== 1 ? 's' : ''}`}
              </p>
              <div className="flex gap-2">
                <PagBtn onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} theme={theme}>← Prev</PagBtn>
                <PagBtn onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} theme={theme}>Next →</PagBtn>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">

          {/* Batch health */}
          <section
            className="p-4"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
              Batch health
            </p>
            <div className="space-y-4">
              <HealthBar label="Contactable" value={contactableCount} total={signals.length} color={theme.accent} theme={theme} />
              <HealthBar label="Processed"   value={signals.length - pendingCount} total={signals.length} color="#10b981" theme={theme} />
              <HealthBar label="High intent" value={highCount}        total={signals.length} color="#EB4203"  theme={theme} />
            </div>
          </section>

          {/* Intent breakdown */}
          <section
            className="p-4"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
              By intent
            </p>

            {/* Stacked bar */}
            {signals.length > 0 && (
              <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full gap-0.5">
                {(['HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'] as const).map((lvl) => {
                  const pct = Math.round((signals.filter((s) => s.intent_level === lvl).length / signals.length) * 100);
                  return pct > 0 ? (
                    <div
                      key={lvl}
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: INTENT[lvl].color }}
                      title={`${INTENT[lvl].label}: ${pct}%`}
                    />
                  ) : null;
                })}
              </div>
            )}

            <div className="space-y-2.5">
              {(['HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'] as const).map((lvl) => {
                const meta = INTENT[lvl];
                const count = signals.filter((s) => s.intent_level === lvl).length;
                const pct = signals.length ? Math.round((count / signals.length) * 100) : 0;
                return (
                  <div key={lvl} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-white/70">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tabular-nums text-white/60" style={{ fontFamily: theme.fontMono }}>
                        {count}
                      </span>
                      <span className="w-8 text-right text-[10px] tabular-nums text-white/30" style={{ fontFamily: theme.fontMono }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Routing rule — pg-on-dark keeps text white in light mode */}
          <section
            className="pg-on-dark p-4"
            style={{
              background: '#112126',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: theme.accent, fontFamily: theme.fontMono }}>
              Routing rule
            </p>
            <p className="text-[15px] font-black leading-snug tracking-tight text-white">
              Urgency + contactability decides the route.
            </p>
            <p className="mt-2.5 text-[13px] leading-[1.65] text-white/55">
              High intent without contact data → enrich first. Medium intent with pain points → nurture or outbound review.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ── SignalRow ──────────────────────────────────────────────────────────────────

function SignalRow({
  signal, theme, isLast, onOpen,
}: {
  signal: Signal;
  theme: ReturnType<typeof useWorkspaceTheme>;
  isLast: boolean;
  onOpen: () => void;
}) {
  const intent = getIntent(signal.intent_level);
  const score  = signal.urgency_score ?? null;
  const platformColor = theme.platform[signal.source] || theme.chart[3];
  const painPoints = (signal.pain_points || []).slice(0, 2);

  return (
    <button
      onClick={onOpen}
      className="group w-full text-left transition-colors hover:bg-white/[0.025]"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--a-border)',
        // Colored left stripe keyed to intent level
        boxShadow: `inset 4px 0 0 ${intent.color}`,
      }}
    >
      {/* Mobile (stacked) */}
      <div className="flex flex-col gap-2 p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <IntentPill intent={intent} theme={theme} />
          <ScoreRing score={score} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: platformColor }} />
            <p className="text-[14px] font-semibold text-white">{signal.name || signal.username || 'Unknown'}</p>
          </div>
          <p className="text-xs text-white/40">{signal.email || signal.phone || 'No contact'}</p>
        </div>
        <p className="line-clamp-1 text-sm text-white/50">{signal.summary || signal.content}</p>
        {painPoints.length > 0 && (
          <div className="flex gap-1.5">
            {painPoints.map((p) => <Chip key={p}>{p}</Chip>)}
          </div>
        )}
      </div>

      {/* Desktop (columns — matches header) */}
      <div
        className="hidden lg:grid items-center gap-4 px-5 py-3.5"
        style={{ gridTemplateColumns: '104px 196px minmax(0,1fr) 60px 90px 72px' }}
      >
        {/* Intent */}
        <IntentPill intent={intent} theme={theme} />

        {/* Contact */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: platformColor }}
              title={signal.source}
            />
            <p className="truncate text-[13px] font-semibold leading-tight text-white">
              {signal.name || signal.username || 'Unknown contact'}
            </p>
          </div>
          <p className="mt-0.5 truncate pl-3 text-[11px] text-white/40">
            {signal.email || signal.phone || <span className="italic">No contact</span>}
          </p>
        </div>

        {/* Signal body */}
        <div className="min-w-0">
          <p className="truncate text-sm text-white/60">{signal.summary || signal.content || '—'}</p>
          {painPoints.length > 0 && (
            <div className="mt-1.5 flex gap-1.5">
              {painPoints.map((p) => <Chip key={p}>{p}</Chip>)}
            </div>
          )}
        </div>

        {/* Score ring */}
        <div className="flex justify-center">
          <ScoreRing score={score} />
        </div>

        {/* Status */}
        <div>
          {signal.processed ? (
            <StatusPill color="#34d399" bg="rgba(16,185,129,0.12)" label="Done" theme={theme} />
          ) : (
            <StatusPill color="#d4a373" bg="rgba(212,163,115,0.12)" label="Review" theme={theme} />
          )}
        </div>

        {/* Date */}
        <p className="text-right text-[11px] tabular-nums text-white/30 transition-colors group-hover:text-white/50" style={{ fontFamily: theme.fontMono }}>
          {new Date(signal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </button>
  );
}

// ── Micro components ──────────────────────────────────────────────────────────

// Score ring: SVG uses style prop for stroke so CSS vars resolve correctly
function ScoreRing({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-sm text-white/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</span>;
  }
  const color = score >= 7 ? '#EB4203' : score >= 4 ? '#FF9C5F' : '#00CEC8';
  const r = 15;
  const circ = 2 * Math.PI * r;
  const fill = (score / 10) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 40, height: 40 }}>
      <svg width="40" height="40" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        {/* Track — use CSS var via style prop so it works in light mode */}
        <circle cx="20" cy="20" r={r} fill="none" style={{ stroke: 'var(--t-fg-10)' }} strokeWidth="2.5" />
        {/* Fill */}
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ - fill}`}
        />
      </svg>
      <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>
        {score}
      </span>
    </div>
  );
}

function IntentPill({ intent, theme }: { intent: ReturnType<typeof getIntent>; theme: ReturnType<typeof useWorkspaceTheme> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: intent.dimBg, color: intent.color, fontFamily: theme.fontMono }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: intent.color }} />
      {intent.label}
    </span>
  );
}

function StatusPill({ color, bg, label, theme }: { color: string; bg: string; label: string; theme: ReturnType<typeof useWorkspaceTheme> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: bg, color, fontFamily: theme.fontMono }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// Chip — uses CSS var so bg is visible in both light and dark
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white/60"
      style={{ background: 'var(--t-fg-10)' }}
    >
      {children}
    </span>
  );
}

function HealthBar({ label, value, total, color, theme }: {
  label: string; value: number; total: number; color: string; theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] text-white/70">{label}</span>
        <span className="text-[11px] tabular-nums text-white/50" style={{ fontFamily: theme.fontMono }}>
          {value}<span className="text-white/25">/{total}</span>
        </span>
      </div>
      {/* Track uses CSS var, not hardcoded rgba(255,255,255,...) */}
      <div className="h-1 overflow-hidden rounded-full" style={{ background: 'var(--t-fg-08)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function PagBtn({ children, onClick, disabled, theme }: {
  children: React.ReactNode; onClick: () => void; disabled: boolean; theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-25 hover:bg-white/5"
      style={{
        fontFamily: theme.fontMono,
        border: '1px solid var(--a-border)',
        color: 'var(--t-fg-45)',
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {children}
    </button>
  );
}
