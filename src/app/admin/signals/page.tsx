'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useTenantTheme } from '@/lib/tenant-theme';

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
const SOURCES = ['', 'twitter', 'reddit', 'youtube', 'linkedin', 'instagram', 'google'];
const INTENT_CATEGORIES = [
  '', 'Curious', 'Beginner', 'Career Switcher', 'IT Professional Transitioning',
  'Urgent Job Seeker', 'Established Professional', 'Not a Prospect', '__null__',
];
const INGESTION_CATEGORIES = [
  '', 'open_to_work', 'cert_failure', 'adjacent_pivot', 'resume_pain', 'rejection_pain',
  'learning_frustration', 'student_grad', 'cert_prep', 'salary_pivot', 'demographic_affinity',
  'compliance_specialist', 'career_pivot', 'general', '__null__',
];

const prettifyIntentCategory = (v: string) => v === '__null__' ? 'Unclassified' : v;
const prettifyIngestionCategory = (v: string) => {
  if (v === '__null__') return 'Uncategorized';
  return v.split('_').map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
};

export default function SignalsPage() {
  const theme = useTenantTheme();
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

  // Debounce search by 300ms so each keystroke doesn't fire a request.
  useEffect(() => {
    const id = window.setTimeout(() => { fetchSignals(); }, 300);
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

  // Search is now server-side (?q=…) — backend ILIKEs across name, email,
  // phone, content, summary, username, and all enriched_* fields. Local
  // arrays are kept as aliases so the JSX below doesn't need to change.
  const filteredSignals = signals;
  const searchTotalPages = totalPages;
  const pagedFilteredSignals = signals;

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearAll = () => {
    setFilters({
      source: '', intent_level: '', intent_category: '', ingestion_category: '',
      processed: '', has_email: '', automation_sent: '', enrichment: '',
    });
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-7 max-w-[1480px] mx-auto">
      {/* Header */}
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2 flex items-center gap-2.5" style={{ fontFamily: theme.fontMono }}>
            <span className="text-white/55">03</span>
            <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
            <span>Signals</span>
          </p>
          <h1 className="text-white font-bold text-3xl tracking-tight leading-[1.05]">
            Intent signals.
          </h1>
          <p className="text-white/45 text-sm mt-2 max-w-md">
            Public signals from social platforms, classified by Claude into intent
            level, urgency, and pain points.
          </p>
        </div>
      </header>

      {fetchError && (
        <div
          className="px-4 py-3 text-sm flex items-start gap-3"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.20)',
            color: '#fca5a5',
            borderRadius: 'var(--t-radius-sm)',
          }}
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v5M12 16h.01" />
          </svg>
          <span><span className="font-semibold uppercase tracking-[0.18em] text-[11px] mr-2" style={{ fontFamily: theme.fontMono }}>Request failed</span>{fetchError}</span>
        </div>
      )}

      {/* Search + filters */}
      <div
        className="flex flex-col gap-3 px-4 py-3.5"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
        }}
      >
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search content, username, pain points…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-white/30 py-1"
          />
          {activeFilterCount > 0 && (
            <span
              className="text-[10px] uppercase tracking-[0.22em] px-2 py-1"
              style={{
                background: 'var(--t-accent-soft)',
                color: theme.accent,
                fontFamily: theme.fontMono,
                borderRadius: 'var(--t-radius-sm)',
              }}
            >
              {activeFilterCount} active
            </span>
          )}
          {(search || activeFilterCount > 0) && (
            <button
              onClick={clearAll}
              className="text-[10px] uppercase tracking-[0.2em] text-white/45 hover:text-white transition-colors"
              style={{ fontFamily: theme.fontMono }}
            >
              Clear ×
            </button>
          )}
        </div>

        <div className="h-px" style={{ background: 'var(--a-border)' }} />

        <div className="flex flex-wrap gap-2">
          <FilterPill
            label="Source"
            value={filters.source}
            options={[{ value: '', label: 'All' }, ...SOURCES.filter(Boolean).map((s) => ({ value: s, label: s }))]}
            onChange={(v) => handleFilterChange('source', v)}
            theme={theme}
          />
          <FilterPill
            label="Intent"
            value={filters.intent_level}
            options={[{ value: '', label: 'All' }, ...INTENT_LEVELS.filter(Boolean).map((l) => ({ value: l, label: l.replace('_INTENT', '').toLowerCase() }))]}
            onChange={(v) => handleFilterChange('intent_level', v)}
            theme={theme}
          />
          <FilterPill
            label="Status"
            value={filters.processed}
            options={[{ value: '', label: 'All' }, { value: 'true', label: 'Processed' }, { value: 'false', label: 'Pending' }]}
            onChange={(v) => handleFilterChange('processed', v)}
            theme={theme}
          />
          <FilterPill
            label="Category"
            value={filters.intent_category}
            options={[{ value: '', label: 'All' }, ...INTENT_CATEGORIES.filter(Boolean).map((c) => ({ value: c, label: prettifyIntentCategory(c) }))]}
            onChange={(v) => handleFilterChange('intent_category', v)}
            theme={theme}
          />
          <FilterPill
            label="Bucket"
            value={filters.ingestion_category}
            options={[{ value: '', label: 'All' }, ...INGESTION_CATEGORIES.filter(Boolean).map((c) => ({ value: c, label: prettifyIngestionCategory(c) }))]}
            onChange={(v) => handleFilterChange('ingestion_category', v)}
            theme={theme}
          />
          <FilterPill
            label="Email"
            value={filters.has_email}
            options={[{ value: '', label: 'All' }, { value: 'true', label: 'Has email' }, { value: 'false', label: 'No email' }]}
            onChange={(v) => handleFilterChange('has_email', v)}
            theme={theme}
          />
          <FilterPill
            label="Automation"
            value={filters.automation_sent}
            options={[{ value: '', label: 'All' }, { value: 'true', label: 'Sent' }, { value: 'false', label: 'Not sent' }]}
            onChange={(v) => handleFilterChange('automation_sent', v)}
            theme={theme}
          />
          <FilterPill
            label="Enrichment"
            value={filters.enrichment}
            options={[{ value: '', label: 'All' }, { value: 'enriched', label: 'Enriched' }, { value: 'with_email', label: 'Apollo email' }]}
            onChange={(v) => handleFilterChange('enrichment', v)}
            theme={theme}
          />
        </div>
      </div>

      {search && (
        <p
          className="text-[11px] uppercase tracking-[0.22em] text-white/45"
          style={{ fontFamily: theme.fontMono }}
        >
          {filteredSignals.length} result{filteredSignals.length !== 1 ? 's' : ''} · "{search}"
        </p>
      )}

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--t-fg-06)', borderTopColor: theme.accent }}
            />
          </div>
        ) : pagedFilteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-px w-12" style={{ background: 'var(--a-border2)' }} />
            <p className="text-white/35 text-sm">{search ? `No signals match "${search}"` : 'No signals found'}</p>
            <p
              className="text-[10px] uppercase tracking-[0.25em] text-white/25"
              style={{ fontFamily: theme.fontMono }}
            >
              Adjust filters above
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                  {['Source', 'Author', 'Content', 'Intent', 'Urgency', 'Pain points', 'Status', 'Date'].map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40"
                      style={{ fontFamily: theme.fontMono }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedFilteredSignals.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/admin/signals/${s.id}`)}
                    className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: '1px solid var(--a-border)' }}
                  >
                    <td className="px-4 py-4 capitalize">
                      <SourceTag source={s.source} theme={theme} />
                    </td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <p className="font-medium text-white truncate">{s.name || s.username || '—'}</p>
                      {s.name && s.username && s.username !== s.name && !/^ACoAA/i.test(s.username) && (
                        <p
                          className="text-xs text-white/40 truncate mt-0.5"
                          style={{ fontFamily: theme.fontMono }}
                          title={s.username}
                        >
                          @{s.username}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 max-w-md">
                      <p className="text-white/70 text-sm truncate" title={s.content}>
                        {s.content?.slice(0, 120)}{s.content?.length > 120 ? '…' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <IntentBadge level={s.intent_level} theme={theme} />
                    </td>
                    <td className="px-4 py-4">
                      <UrgencyMeter score={s.urgency_score} theme={theme} />
                    </td>
                    <td className="px-4 py-4 max-w-[180px]">
                      <p className="text-white/55 text-xs truncate">
                        {(s.pain_points || []).slice(0, 2).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {s.processed ? (
                        <ToneBadge tone="green" theme={theme}>Processed</ToneBadge>
                      ) : (
                        <ToneBadge tone="gold" theme={theme}>Pending</ToneBadge>
                      )}
                    </td>
                    <td
                      className="px-4 py-4 text-white/40 text-xs whitespace-nowrap tabular-nums"
                      style={{ fontFamily: theme.fontMono }}
                    >
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(() => {
        const activeTotalPages = search ? searchTotalPages : totalPages;
        if (activeTotalPages <= 1) return null;
        return (
          <div className="flex items-center justify-between">
            <p
              className="text-[10px] uppercase tracking-[0.25em] text-white/40 tabular-nums"
              style={{ fontFamily: theme.fontMono }}
            >
              Page {String(page).padStart(2, '0')} / {String(activeTotalPages).padStart(2, '0')}
              {search && ` · ${filteredSignals.length} result${filteredSignals.length !== 1 ? 's' : ''}`}
            </p>
            <div className="flex gap-2">
              <PaginationButton onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} theme={theme}>
                ← Prev
              </PaginationButton>
              <PaginationButton onClick={() => setPage(Math.min(activeTotalPages, page + 1))} disabled={page === activeTotalPages} theme={theme}>
                Next →
              </PaginationButton>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function FilterPill({
  label, value, options, onChange, theme,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  const active = value !== '';
  return (
    <label
      className="relative flex items-center gap-2 pl-3 pr-2 py-1.5 transition-colors cursor-pointer"
      style={{
        background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-02)',
        border: `1px solid ${active ? 'var(--t-accent-soft)' : 'var(--a-border2)'}`,
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.22em] font-semibold"
        style={{
          fontFamily: theme.fontMono,
          color: active ? theme.accent : 'var(--t-fg-55)',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white text-xs font-medium focus:outline-none capitalize cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0d1e30]">{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function SourceTag({ source, theme }: { source: string; theme: ReturnType<typeof useTenantTheme> }) {
  const color = theme.platform[source] || theme.chart[3];
  return (
    <span className="inline-flex items-center gap-2 font-medium text-white">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
      />
      <span className="capitalize">{source}</span>
    </span>
  );
}

function IntentBadge({ level, theme }: { level: string | null; theme: ReturnType<typeof useTenantTheme> }) {
  if (!level) return <ToneBadge tone="blue" theme={theme}>Unclassified</ToneBadge>;
  const tone: 'red' | 'gold' | 'blue' =
    level === 'HIGH_INTENT' ? 'red' : level === 'MEDIUM_INTENT' ? 'gold' : 'blue';
  return <ToneBadge tone={tone} theme={theme}>{level.replace('_INTENT', '').toLowerCase()}</ToneBadge>;
}

function UrgencyMeter({ score, theme }: { score: number; theme: ReturnType<typeof useTenantTheme> }) {
  if (score == null) return <span className="text-white/30 text-sm">—</span>;
  const pct = Math.min(100, (score / 10) * 100);
  const color = score >= 7 ? theme.intent.high : score >= 4 ? theme.intent.medium : theme.intent.low;
  return (
    <div className="flex items-center gap-2 min-w-[86px]">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--t-fg-06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span
        className="text-xs font-bold tabular-nums w-5 text-right"
        style={{ color, fontFamily: theme.fontMono }}
      >
        {score}
      </span>
    </div>
  );
}

function ToneBadge({
  children, tone, theme, title,
}: {
  children: React.ReactNode;
  tone: 'accent' | 'green' | 'gold' | 'blue' | 'red';
  theme: ReturnType<typeof useTenantTheme>;
  title?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    accent: { bg: 'var(--t-accent-soft)', fg: theme.accent },
    green:  { bg: 'rgba(16,185,129,0.12)', fg: '#34d399' },
    gold:   { bg: 'rgba(212,163,115,0.12)', fg: '#d4a373' },
    blue:   { bg: 'rgba(99,102,241,0.12)', fg: '#a5b4fc' },
    red:    { bg: 'rgba(239,68,68,0.12)',  fg: '#f87171' },
  };
  const { bg, fg } = map[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize"
      style={{
        background: bg, color: fg,
        borderRadius: 'var(--t-radius-sm)',
        fontFamily: theme.fontMono,
      }}
    >
      {children}
    </span>
  );
}

function PaginationButton({
  children, onClick, disabled, theme,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.04]"
      style={{
        fontFamily: theme.fontMono,
        border: '1px solid var(--a-border2)',
        color: 'var(--t-fg-70)',
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {children}
    </button>
  );
}
