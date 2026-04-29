'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useTenantTheme } from '@/lib/tenant-theme';

interface Lead {
  id: string;
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start: string;
  income_goal: string;
  source_tool: string;
  intent_level: string;
  consented: boolean;
  ghl_contact_id: string | null;
  lead_source: string | null;
  created_at: string;
}

function sourceLabel(s: string | null | undefined): { label: string; tone: 'gold' | 'blue' | 'green' } {
  switch (s) {
    case 'cr':
    case 'crawler':
      return { label: 'Agent Crawler', tone: 'gold' };
    case 'so':
    case 'social':
      return { label: 'Social Media', tone: 'blue' };
    default:
      return { label: 'Website', tone: 'green' };
  }
}

const TOOLS = ['', 'cyber-path-finder', 'career-assessment', 'resume-analyzer'];
const INTENT_LEVELS = ['', 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'];

function toolLabel(tool: string) {
  return tool.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function LeadsPage() {
  const theme = useTenantTheme();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ source_tool: '', intent_level: '' });
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncResult, setSyncResult] = useState<{ queued: number } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filters.source_tool) params.source_tool = filters.source_tool;
      if (filters.intent_level) params.intent_level = filters.intent_level;

      const res = await adminApi.getLeads(params);
      setLeads(res.data.leads || res.data.data || []);
      setTotalPages(
        res.data.total_pages || res.data.totalPages || res.data.pagination?.total_pages || 1,
      );
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleGhlSync = async () => {
    setSyncState('syncing');
    setSyncResult(null);
    try {
      const res = await adminApi.retryGhlSync();
      setSyncResult(res.data);
      setSyncState('done');
      setTimeout(() => fetchLeads(), 3000);
      setTimeout(() => setSyncState('idle'), 6000);
    } catch {
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  const unsyncedCount = leads.filter((l) => !l.ghl_contact_id).length;

  return (
    <div className="space-y-7 max-w-[1480px] mx-auto">
      {/* Header */}
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2 flex items-center gap-2.5" style={{ fontFamily: theme.fontMono }}>
            <span className="text-white/55">02</span>
            <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
            <span>Leads</span>
          </p>
          <h1 className="text-white font-bold text-3xl tracking-tight leading-[1.05]">
            Captured leads.
          </h1>
          <p className="text-white/45 text-sm mt-2 max-w-md">
            Verified leads from career tools and crawler enrichment, synced to GoHighLevel.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={handleGhlSync}
            disabled={syncState === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: theme.fontMono,
              borderRadius: 'var(--t-radius-sm)',
              background:
                syncState === 'done' ? 'rgba(16,185,129,0.10)'
                : syncState === 'error' ? 'rgba(239,68,68,0.10)'
                : 'var(--t-accent-soft)',
              border: `1px solid ${
                syncState === 'done' ? 'rgba(16,185,129,0.30)'
                : syncState === 'error' ? 'rgba(239,68,68,0.30)'
                : 'var(--t-accent-soft)'
              }`,
              color:
                syncState === 'done' ? '#34d399'
                : syncState === 'error' ? '#f87171'
                : theme.accent,
            }}
          >
            {syncState === 'syncing' ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Syncing
              </>
            ) : syncState === 'done' ? (
              <>✓ Queued {syncResult?.queued ?? 0}</>
            ) : syncState === 'error' ? (
              <>✗ Sync failed — retry</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync to GHL
                {unsyncedCount > 0 && (
                  <span
                    className="ml-1 px-1.5 py-0.5 text-[9px] tabular-nums font-bold"
                    style={{
                      background: theme.accent,
                      color: theme.accentOn,
                      borderRadius: 'var(--t-radius-sm)',
                    }}
                  >
                    {unsyncedCount}
                  </span>
                )}
              </>
            )}
          </button>
          {unsyncedCount > 0 && syncState === 'idle' && (
            <p
              className="text-white/30 text-[10px] uppercase tracking-[0.18em]"
              style={{ fontFamily: theme.fontMono }}
            >
              {unsyncedCount} unsynced on this page
            </p>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2.5 px-4 py-3"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius)',
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 mr-2" style={{ fontFamily: theme.fontMono }}>
          Filter
        </span>

        <FilterPill
          label="Tool"
          value={filters.source_tool}
          options={[{ value: '', label: 'All' }, ...TOOLS.filter(Boolean).map((t) => ({ value: t, label: toolLabel(t) }))]}
          onChange={(v) => handleFilterChange('source_tool', v)}
          accent={theme.accent}
        />
        <FilterPill
          label="Intent"
          value={filters.intent_level}
          options={[{ value: '', label: 'All' }, ...INTENT_LEVELS.filter(Boolean).map((l) => ({ value: l, label: l.replace('_INTENT', '').toLowerCase() }))]}
          onChange={(v) => handleFilterChange('intent_level', v)}
          accent={theme.accent}
        />

        {(filters.source_tool || filters.intent_level) && (
          <button
            onClick={() => { setFilters({ source_tool: '', intent_level: '' }); setPage(1); }}
            className="ml-auto text-[10px] uppercase tracking-[0.2em] text-white/45 hover:text-white transition-colors"
            style={{ fontFamily: theme.fontMono }}
          >
            Clear ×
          </button>
        )}
      </div>

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
        ) : leads.length === 0 ? (
          <EmptyTable theme={theme} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--a-border)' }}>
                  {['Name', 'Contact', 'Timeline', 'Income', 'Tool', 'Source', 'Intent', 'GHL', 'Consent', 'Date'].map((h, i) => (
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
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: '1px solid var(--a-border)' }}
                  >
                    <td className="px-4 py-4 font-medium text-white whitespace-nowrap">
                      {lead.first_name}
                    </td>
                    <td className="px-4 py-4 max-w-[280px]">
                      <p className="text-white/85 truncate">{lead.email}</p>
                      <p className="text-white/40 text-xs mt-0.5 tabular-nums" style={{ fontFamily: theme.fontMono }}>
                        {lead.phone_number || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-white/55 text-xs">{lead.timeline_to_start || '—'}</td>
                    <td className="px-4 py-4 text-white/55 text-xs">{lead.income_goal || '—'}</td>
                    <td className="px-4 py-4">
                      <ToneBadge tone="accent" theme={theme}>{toolLabel(lead.source_tool)}</ToneBadge>
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const { label, tone } = sourceLabel(lead.lead_source);
                        return <ToneBadge tone={tone} theme={theme}>{label}</ToneBadge>;
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      <ToneBadge
                        tone={
                          lead.intent_level === 'HIGH_INTENT' ? 'red'
                          : lead.intent_level === 'MEDIUM_INTENT' ? 'gold'
                          : 'green'
                        }
                        theme={theme}
                      >
                        {(lead.intent_level || 'N/A').replace('_INTENT', '').toLowerCase()}
                      </ToneBadge>
                    </td>
                    <td className="px-4 py-4">
                      {lead.ghl_contact_id ? (
                        <ToneBadge tone="green" theme={theme} title={lead.ghl_contact_id}>✓ Synced</ToneBadge>
                      ) : (
                        <ToneBadge tone="gold" theme={theme}>Pending</ToneBadge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {lead.consented
                        ? <ToneBadge tone="green" theme={theme}>Yes</ToneBadge>
                        : <ToneBadge tone="red" theme={theme}>No</ToneBadge>}
                    </td>
                    <td
                      className="px-4 py-4 text-white/40 text-xs whitespace-nowrap tabular-nums"
                      style={{ fontFamily: theme.fontMono }}
                    >
                      {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p
            className="text-[10px] uppercase tracking-[0.25em] text-white/40 tabular-nums"
            style={{ fontFamily: theme.fontMono }}
          >
            Page {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
          </p>
          <div className="flex gap-2">
            <PaginationButton onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} theme={theme}>
              ← Prev
            </PaginationButton>
            <PaginationButton onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} theme={theme}>
              Next →
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function FilterPill({
  label, value, options, onChange, accent,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  accent: string;
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
          fontFamily: 'var(--t-mono-font)',
          color: active ? accent : 'var(--t-fg-55)',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white text-xs font-medium focus:outline-none capitalize cursor-pointer pr-1"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0d1e30]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
        background: bg,
        color: fg,
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

function EmptyTable({ theme }: { theme: ReturnType<typeof useTenantTheme> }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-px w-12" style={{ background: 'var(--a-border2)' }} />
      <p className="text-white/35 text-sm">No leads match these filters.</p>
      <p
        className="text-[10px] uppercase tracking-[0.25em] text-white/25"
        style={{ fontFamily: theme.fontMono }}
      >
        Adjust filters above
      </p>
    </div>
  );
}
