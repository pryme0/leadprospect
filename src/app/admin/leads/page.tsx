'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

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
    case 'crawler':  return { label: 'Agent Crawler', tone: 'gold' };
    case 'so':
    case 'social':   return { label: 'Social Media',  tone: 'blue' };
    default:         return { label: 'Website',       tone: 'green' };
  }
}

const LEAD_SOURCES   = ['google-ads', 'meta-ads', 'instagram-ads', 'linkedin-ads', 'crm-import'];
const INTENT_LEVELS  = ['', 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'];

const INTENT_META: Record<string, { label: string; color: string; dimBg: string }> = {
  HIGH_INTENT:   { label: 'High',   color: '#EB4203', dimBg: 'rgba(235,66,3,0.10)'   },
  MEDIUM_INTENT: { label: 'Medium', color: '#FF9C5F', dimBg: 'rgba(255,156,95,0.10)' },
  LOW_INTENT:    { label: 'Low',    color: '#00CEC8', dimBg: 'rgba(0,206,200,0.10)'  },
};

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  'Route now':       { label: 'Route now',       color: '#EB4203', bg: 'rgba(235,66,3,0.12)'    },
  'Consent needed':  { label: 'Consent needed',  color: '#f87171', bg: 'rgba(239,68,68,0.12)'   },
  'Sync pending':    { label: 'Sync pending',    color: '#FF9C5F', bg: 'rgba(255,156,95,0.12)'  },
  'In workflow':     { label: 'In workflow',     color: '#34d399', bg: 'rgba(16,185,129,0.12)'  },
};

function getAction(lead: Lead): keyof typeof ACTION_META {
  if (lead.intent_level === 'HIGH_INTENT' && lead.consented && !lead.ghl_contact_id) return 'Route now';
  if (!lead.consented) return 'Consent needed';
  if (!lead.ghl_contact_id) return 'Sync pending';
  return 'In workflow';
}

function toolLabel(tool: string) {
  return tool.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function LeadsPage() {
  const theme = useWorkspaceTheme();
  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [filters,     setFilters]     = useState({ source_tool: '', intent_level: '' });
  const [syncState,   setSyncState]   = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncResult,  setSyncResult]  = useState<{ queued: number } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filters.source_tool)  params.source_tool  = filters.source_tool;
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

  const unsyncedCount   = leads.filter((l) => !l.ghl_contact_id).length;
  const highIntentCount = leads.filter((l) => l.intent_level === 'HIGH_INTENT').length;
  const consentedCount  = leads.filter((l) => l.consented).length;
  const syncedCount     = leads.length - unsyncedCount;
  const consentPct      = leads.length ? Math.round((consentedCount / leads.length) * 100) : 0;

  const sourceBreakdown = LEAD_SOURCES
    .map((source) => ({ source, count: leads.filter((l) => l.source_tool === source).length }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  const hasActiveFilters = !!(filters.source_tool || filters.intent_level);

  const stats = [
    { label: 'Total leads',   value: leads.length,   color: theme.accent  },
    { label: 'High intent',   value: highIntentCount, color: '#EB4203'    },
    { label: 'CRM synced',    value: syncedCount,     color: '#10b981'    },
    { label: 'Consent rate',  value: `${consentPct}%`, color: '#FF9C5F'  },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">

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
          <div className="max-w-lg">
            <p
              className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em]"
              style={{ color: theme.accent, fontFamily: theme.fontMono }}
            >
              05 · Lead operations
            </p>
            <h1 className="text-[26px] font-black leading-tight tracking-tight text-white">
              Lead Queue
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              Scored, attributed, and consent-checked. Route high-intent unsynced records first.
            </p>
          </div>

          {/* Stat tiles */}
          <div className="flex flex-wrap gap-2.5">
            {stats.map(({ label, value, color }) => (
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
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CRM sync footer */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-6"
          style={{ borderTop: '1px solid var(--a-border)' }}
        >
          <p className="text-xs text-white/60">
            CRM status:{' '}
            <span className="font-semibold text-white">
              {unsyncedCount ? `${unsyncedCount} records need sync` : 'all visible records synced'}
            </span>
          </p>
          <button
            onClick={handleGhlSync}
            disabled={syncState === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: theme.fontMono,
              borderRadius: 'var(--t-radius-sm)',
              background:
                syncState === 'done'  ? 'rgba(16,185,129,0.14)'
                : syncState === 'error' ? 'rgba(239,68,68,0.14)'
                : theme.accent,
              border: `1px solid ${
                syncState === 'done'  ? 'rgba(16,185,129,0.34)'
                : syncState === 'error' ? 'rgba(239,68,68,0.34)'
                : theme.accent
              }`,
              color:
                syncState === 'done'  ? '#34d399'
                : syncState === 'error' ? '#fca5a5'
                : theme.accentOn,
            }}
          >
            {syncState === 'syncing' ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Syncing…
              </>
            ) : syncState === 'done' ? (
              <>✓ Queued {syncResult?.queued ?? 0}</>
            ) : syncState === 'error' ? (
              <>Failed · retry</>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync to CRM
                {unsyncedCount > 0 && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px]"
                    style={{ background: theme.accentOn, color: theme.accent }}
                  >
                    {unsyncedCount}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Filter bar ── */}
      <div
        className="flex flex-wrap items-center gap-2"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          padding: '10px 16px',
        }}
      >
        <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
          Filter
        </span>

        {[
          {
            key: 'source_tool',
            label: 'Source',
            value: filters.source_tool,
            options: [{ value: '', label: 'All' }, ...LEAD_SOURCES.map((t) => ({ value: t, label: toolLabel(t) }))],
          },
          {
            key: 'intent_level',
            label: 'Intent',
            value: filters.intent_level,
            options: [{ value: '', label: 'All' }, ...INTENT_LEVELS.filter(Boolean).map((l) => ({ value: l, label: l.replace('_INTENT', '').toLowerCase() }))],
          },
        ].map(({ key, label, value, options }) => {
          const active = value !== '';
          return (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all"
              style={{
                background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-04)',
                border: `1px solid ${active ? theme.accent + '50' : 'var(--a-border)'}`,
              }}
            >
              <span
                className="text-[9px] font-bold uppercase tracking-[0.28em]"
                style={{ fontFamily: theme.fontMono, color: active ? theme.accent : 'var(--t-fg-40)' }}
              >
                {label}
              </span>
              <span style={{ color: 'var(--t-fg-15)', fontSize: 10, userSelect: 'none' }}>·</span>
              <select
                value={value}
                onChange={(e) => handleFilterChange(key, e.target.value)}
                className="cursor-pointer bg-transparent text-[12px] font-medium capitalize text-white/80 focus:outline-none"
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#112126]">{o.label}</option>
                ))}
              </select>
            </label>
          );
        })}

        {hasActiveFilters && (
          <button
            onClick={() => { setFilters({ source_tool: '', intent_level: '' }); setPage(1); }}
            className="ml-auto text-[11px] text-white/30 transition-colors hover:text-white/60"
            style={{ fontFamily: theme.fontMono }}
          >
            Clear ×
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),300px]">

        {/* Lead table */}
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
            className="hidden lg:grid px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.26em] text-white/30"
            style={{
              gridTemplateColumns: '140px minmax(0,1fr) 120px 110px 130px',
              borderBottom: '1px solid var(--a-border)',
              background: 'var(--t-fg-03)',
              fontFamily: theme.fontMono,
            }}
          >
            <span>Contact</span>
            <span>Source</span>
            <span>Window</span>
            <span>Value</span>
            <span>Action</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }}
              />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div
                className="mb-2 flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'var(--t-fg-04)', border: '1px solid var(--a-border)' }}
              >
                <svg className="h-5 w-5 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <circle cx="9" cy="8" r="3" />
                  <path strokeLinecap="round" d="M3 21v-1a6 6 0 0112 0v1" />
                </svg>
              </div>
              <p className="text-sm text-white/30">No leads match these filters</p>
              <p className="text-[10px] uppercase tracking-widest text-white/20" style={{ fontFamily: theme.fontMono }}>
                Adjust filters above
              </p>
            </div>
          ) : (
            leads.map((lead, i) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                theme={theme}
                isLast={i === leads.length - 1}
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

          {/* Source quality */}
          <section
            className="p-4"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
              Source quality
            </p>
            <div className="space-y-3.5">
              {(sourceBreakdown.length
                ? sourceBreakdown
                : [{ source: 'No active sources', count: 0 }]
              ).map((item) => {
                const pct = leads.length ? Math.max(8, (item.count / leads.length) * 100) : 0;
                return (
                  <div key={item.source}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{toolLabel(item.source)}</span>
                      <span className="text-xs tabular-nums text-white/50" style={{ fontFamily: theme.fontMono }}>{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--t-fg-08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${theme.accent}, #FF9C5F)` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Action breakdown */}
          <section
            className="p-4"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
              Queue breakdown
            </p>
            <div className="space-y-2.5">
              {Object.entries(ACTION_META).map(([key, meta]) => {
                const count = leads.filter((l) => getAction(l) === key).length;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-white/70">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-white/60" style={{ fontFamily: theme.fontMono }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Triage rule — pg-on-dark preserves white text in light mode */}
          <section
            className="pg-on-dark p-4"
            style={{
              background: '#112126',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: theme.accent, fontFamily: theme.fontMono }}>
              Triage rule
            </p>
            <p className="text-[15px] font-black leading-snug tracking-tight text-white">
              Work high-intent, consented, unsynced records first.
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-white/60">
              Low-intent records stay in nurture unless source quality improves.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ── LeadRow ───────────────────────────────────────────────────────────────────

function LeadRow({
  lead, theme, isLast,
}: {
  lead: Lead;
  theme: ReturnType<typeof useWorkspaceTheme>;
  isLast: boolean;
}) {
  const intentMeta = INTENT_META[lead.intent_level] ?? { label: 'N/A', color: 'var(--t-fg-30)', dimBg: 'var(--t-fg-05)' };
  const action     = getAction(lead);
  const actionMeta = ACTION_META[action];
  const { label: originLabel, tone: originTone } = sourceLabel(lead.lead_source);

  const initials = lead.first_name?.slice(0, 2).toUpperCase() || 'LD';

  return (
    <div
      className="group"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--a-border)',
        boxShadow: `inset 4px 0 0 ${intentMeta.color}`,
      }}
    >
      {/* Mobile (stacked) */}
      <div className="flex flex-col gap-3 p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initials} theme={theme} />
            <div>
              <p className="text-[14px] font-semibold text-white">{lead.first_name || 'Unnamed'}</p>
              <p className="text-xs text-white/50">{lead.email}</p>
            </div>
          </div>
          <ActionPill action={action} meta={actionMeta} theme={theme} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <IntentPill meta={intentMeta} theme={theme} />
          <ToneBadge tone={originTone} theme={theme}>{originLabel}</ToneBadge>
          <ToneBadge tone="accent" theme={theme}>{toolLabel(lead.source_tool)}</ToneBadge>
        </div>
        <div className="flex gap-4">
          <MiniField label="Window" value={lead.timeline_to_start || 'Not set'} theme={theme} />
          <MiniField label="Value"  value={lead.income_goal      || 'Unscored'} theme={theme} />
        </div>
        <div className="flex gap-2">
          <StatusDot active={!!lead.ghl_contact_id} label={lead.ghl_contact_id ? 'CRM synced' : 'CRM pending'} activeColor="#34d399" theme={theme} />
          <StatusDot active={lead.consented}         label={lead.consented ? 'Consent' : 'No consent'}      activeColor={theme.accent} theme={theme} />
        </div>
      </div>

      {/* Desktop (columns — matches header) */}
      <div
        className="hidden lg:grid items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
        style={{ gridTemplateColumns: '140px minmax(0,1fr) 120px 110px 130px' }}
      >
        {/* Contact */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar initials={initials} theme={theme} small />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white leading-tight">
              {lead.first_name || 'Unnamed'}
            </p>
            <p className="truncate text-[11px] text-white/40">{lead.email}</p>
          </div>
        </div>

        {/* Source + badges */}
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <IntentPill meta={intentMeta} theme={theme} />
            <ToneBadge tone={originTone} theme={theme}>{originLabel}</ToneBadge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ToneBadge tone="accent" theme={theme}>{toolLabel(lead.source_tool)}</ToneBadge>
            <StatusDot active={!!lead.ghl_contact_id} label={lead.ghl_contact_id ? 'CRM' : 'No CRM'} activeColor="#34d399" theme={theme} />
            <StatusDot active={lead.consented}         label={lead.consented ? 'Consent' : 'No consent'} activeColor={theme.accent} theme={theme} />
          </div>
        </div>

        {/* Buying window */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: theme.fontMono }}>Window</p>
          <p className="text-sm font-medium text-white truncate">{lead.timeline_to_start || <span className="text-white/30 italic">Not set</span>}</p>
        </div>

        {/* Pipeline value */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: theme.fontMono }}>Value</p>
          <p className="text-sm font-medium text-white truncate">{lead.income_goal || <span className="text-white/30 italic">Unscored</span>}</p>
        </div>

        {/* Action */}
        <ActionPill action={action} meta={actionMeta} theme={theme} />
      </div>
    </div>
  );
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Avatar({ initials, theme, small }: { initials: string; theme: ReturnType<typeof useWorkspaceTheme>; small?: boolean }) {
  const size = small ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <span
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-lg font-black`}
      style={{ background: theme.accentSoft, color: theme.accent }}
    >
      {initials}
    </span>
  );
}

function IntentPill({ meta, theme }: {
  meta: { label: string; color: string; dimBg: string };
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: meta.dimBg, color: meta.color, fontFamily: theme.fontMono }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function ActionPill({
  action, meta, theme,
}: {
  action: string;
  meta: { label: string; color: string; bg: string };
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={{ background: meta.bg, color: meta.color, fontFamily: theme.fontMono }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function StatusDot({ active, label, activeColor, theme }: {
  active: boolean;
  label: string;
  activeColor: string;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: active ? `${activeColor}15` : 'var(--t-fg-05)',
        color: active ? activeColor : 'var(--t-fg-30)',
      }}
    >
      <span
        className="h-1 w-1 rounded-full shrink-0"
        style={{ background: active ? activeColor : 'var(--t-fg-20)' }}
      />
      {label}
    </span>
  );
}

function ToneBadge({ children, tone, theme, title }: {
  children: React.ReactNode;
  tone: 'accent' | 'green' | 'gold' | 'blue' | 'red';
  theme: ReturnType<typeof useWorkspaceTheme>;
  title?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    accent: { bg: theme.accentSoft, fg: theme.accent },
    green:  { bg: 'rgba(16,185,129,0.12)',  fg: '#34d399' },
    gold:   { bg: 'rgba(212,163,115,0.12)', fg: '#d4a373' },
    blue:   { bg: 'rgba(99,102,241,0.12)',  fg: '#a5b4fc' },
    red:    { bg: 'rgba(239,68,68,0.12)',   fg: '#f87171' },
  };
  const { bg, fg } = map[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize"
      style={{ background: bg, color: fg, borderRadius: 'var(--t-radius-sm)', fontFamily: theme.fontMono }}
    >
      {children}
    </span>
  );
}

function MiniField({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useWorkspaceTheme> }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/30" style={{ fontFamily: theme.fontMono }}>{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white/80">{value}</p>
    </div>
  );
}

function PagBtn({ children, onClick, disabled, theme }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  theme: ReturnType<typeof useWorkspaceTheme>;
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
