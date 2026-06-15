'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { INTEGRATIONS, type IntegrationCategory } from '@/lib/integrations';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

type ConnectorState = 'connected' | 'needs-setup' | 'syncing' | 'error';
type StatusFilter = 'all' | ConnectorState;

const initialStatuses: Record<string, ConnectorState> = {
  'google-ads': 'connected',
  'meta-ads': 'connected',
  'tiktok-ads': 'connected',
  'linkedin-ads': 'connected',
  hubspot: 'connected',
  salesforce: 'needs-setup',
  'website-forms': 'connected',
  'lead-enrichment': 'connected',
};

const categories: Array<{ value: 'all' | IntegrationCategory; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'ad-platform', label: 'Ad platforms' },
  { value: 'crm', label: 'CRM' },
  { value: 'capture', label: 'Capture' },
  { value: 'enrichment', label: 'Enrichment' },
];

const statusLabels: Record<ConnectorState, string> = {
  connected: 'Connected',
  'needs-setup': 'Needs setup',
  syncing: 'Syncing',
  error: 'Action failed',
};

function statusStyle(status: ConnectorState) {
  if (status === 'connected') return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.26)', color: '#047857' };
  if (status === 'syncing') return { bg: 'rgba(0,206,200,0.14)', border: 'rgba(0,206,200,0.28)', color: '#0f766e' };
  if (status === 'error') return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#b91c1c' };
  return { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.30)', color: '#b45309' };
}

function ConnectorStatus({ status }: { status: ConnectorState }) {
  const style = statusStyle(status);

  return (
    <span
      className="inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ background: style.bg, borderColor: style.border, color: style.color }}
    >
      <span className={status === 'syncing' ? 'h-1.5 w-1.5 animate-pulse rounded-full' : 'h-1.5 w-1.5 rounded-full'} style={{ background: style.color }} />
      {statusLabels[status]}
    </span>
  );
}

function toTitle(value: string) {
  return value.replace(/-/g, ' ');
}

function readableOn(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '#112126';
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#112126' : '#ffffff';
}

export default function IntegrationsPage() {
  const theme = useWorkspaceTheme();
  const [statuses, setStatuses] = useState<Record<string, ConnectorState>>(initialStatuses);
  const [category, setCategory] = useState<'all' | IntegrationCategory>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(INTEGRATIONS[0]?.id ?? '');
  const [activity, setActivity] = useState([
    'Google Ads uploaded 92 qualified offline conversions.',
    'Meta Lead Ads webhook delivered 57 forms successfully.',
    'Salesforce is waiting for OAuth and custom field validation.',
  ]);

  const selected = INTEGRATIONS.find((integration) => integration.id === selectedId) ?? INTEGRATIONS[0];
  const selectedStatus = selected ? statuses[selected.id] ?? 'needs-setup' : 'needs-setup';

  const filteredIntegrations = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return INTEGRATIONS.filter((integration) => {
      const matchesCategory = category === 'all' || integration.category === category;
      const matchesStatus = statusFilter === 'all' || (statuses[integration.id] ?? 'needs-setup') === statusFilter;
      const searchable = [
        integration.label,
        integration.description,
        integration.summary,
        integration.category,
        ...integration.pulls.flatMap((dataset) => [dataset.name, ...dataset.fields]),
        ...integration.sends.flatMap((dataset) => [dataset.name, ...dataset.fields]),
      ].join(' ').toLowerCase();

      return matchesCategory && matchesStatus && (!normalized || searchable.includes(normalized));
    });
  }, [category, query, statusFilter, statuses]);

  const connectedCount = Object.values(statuses).filter((status) => status === 'connected').length;
  const actionNeededCount = Object.values(statuses).filter((status) => status === 'needs-setup' || status === 'error').length;
  const activeFilterCount = Number(category !== 'all') + Number(statusFilter !== 'all') + Number(query.trim() !== '');

  function appendActivity(message: string) {
    setActivity((current) => [message, ...current].slice(0, 5));
  }

  function runConnectorAction(id: string, label: string) {
    const integration = INTEGRATIONS.find((item) => item.id === id);
    if (!integration) return;

    setStatuses((current) => ({ ...current, [id]: 'syncing' }));
    appendActivity(`${integration.label}: ${label.toLowerCase()} started.`);

    window.setTimeout(() => {
      setStatuses((current) => ({ ...current, [id]: 'connected' }));
      appendActivity(`${integration.label}: ${label.toLowerCase()} completed using demo data.`);
    }, 850);
  }

  function resetFilters() {
    setCategory('all');
    setStatusFilter('all');
    setQuery('');
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header
        className="pg-on-dark overflow-hidden"
        style={{
          background: '#112126',
          borderRadius: 'var(--t-radius-lg)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 28px 70px -42px rgba(16,21,16,0.55)',
        }}
      >
        <div className="grid gap-px bg-white/10 lg:grid-cols-[1fr,380px]">
          <div className="bg-[#112126] p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45" style={{ fontFamily: theme.fontMono }}>
              Connector control plane
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Integration workspaces</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
              Connect lead sources, test mappings, inspect fields, and simulate syncs across ad platforms, CRM systems, form capture, and enrichment providers.
            </p>
          </div>
          <div className="grid grid-cols-3 bg-[#112126] lg:grid-cols-1">
            {[
              { label: 'Connected', value: connectedCount },
              { label: 'Need action', value: actionNeededCount },
              { label: 'Total', value: INTEGRATIONS.length },
            ].map((stat) => (
              <div key={stat.label} className="border-l border-white/10 px-4 py-5 lg:border-l-0 lg:border-t">
                <p className="text-3xl font-black tabular-nums text-white">{stat.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45" style={{ fontFamily: theme.fontMono }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section
        className="grid gap-3 p-3 lg:grid-cols-[minmax(240px,1fr),auto,auto]"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          boxShadow: 'var(--t-card-shadow)',
        }}
      >
        <label className="block">
          <span className="sr-only">Search integrations</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fields, sources, APIs..."
            className="h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2"
            style={{
              background: 'var(--a-card2)',
              borderColor: 'var(--a-border)',
              color: 'var(--t-fg-95)',
              caretColor: theme.accent,
            }}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((item) => {
            const active = item.value === category;
            return (
              <button
                key={item.value}
                onClick={() => setCategory(item.value)}
                className="min-h-11 rounded-lg border px-3 text-xs font-semibold transition"
                style={{
                  background: active ? theme.accentSoft : 'var(--a-card2)',
                  borderColor: active ? `${theme.accent}55` : 'var(--a-border)',
                  color: active ? theme.accent : 'var(--t-fg-70)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <label className="flex min-h-11 items-center gap-2 rounded-lg border px-3" style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="bg-transparent text-sm font-semibold outline-none"
            style={{ color: 'var(--t-fg-85)' }}
          >
            <option value="all">All</option>
            <option value="connected">Connected</option>
            <option value="needs-setup">Needs setup</option>
            <option value="syncing">Syncing</option>
            <option value="error">Action failed</option>
          </select>
        </label>

        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="min-h-10 rounded-lg border px-3 text-xs font-semibold transition hover:opacity-80 lg:col-start-3"
            style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)', color: 'var(--t-fg-70)' }}
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),390px]">
        <section
          className="overflow-hidden"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
            boxShadow: 'var(--t-card-shadow)',
          }}
        >
          <div
            className="grid grid-cols-[minmax(0,1fr),130px,110px] gap-4 border-b px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ borderColor: 'var(--a-border)', color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}
          >
            <span>Connector</span>
            <span className="hidden sm:block">Category</span>
            <span className="text-right">State</span>
          </div>

          {filteredIntegrations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--t-fg-95)' }}>No connectors match these filters.</p>
              <button onClick={resetFilters} className="mt-3 text-sm font-semibold" style={{ color: theme.accent }}>
                Reset filter desk
              </button>
            </div>
          ) : (
            filteredIntegrations.map((integration) => {
              const status = statuses[integration.id] ?? 'needs-setup';
              const active = integration.id === selected?.id;

              return (
                <button
                  key={integration.id}
                  onClick={() => setSelectedId(integration.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr),130px,110px] items-center gap-4 border-b px-5 py-4 text-left transition last:border-b-0"
                  style={{
                    borderColor: 'var(--a-border)',
                    background: active ? theme.accentSoft : 'transparent',
                  }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-black"
                      style={{
                        background: `${integration.accent}14`,
                        borderColor: `${integration.accent}34`,
                        color: integration.accent,
                      }}
                    >
                      {integration.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold" style={{ color: 'var(--t-fg-95)' }}>{integration.label}</span>
                      <span className="mt-1 line-clamp-1 block text-xs" style={{ color: 'var(--t-fg-45)' }}>{integration.description}</span>
                    </span>
                  </span>
                  <span className="hidden text-xs font-semibold capitalize sm:block" style={{ color: 'var(--t-fg-55)' }}>
                    {toTitle(integration.category)}
                  </span>
                  <span className="flex justify-end">
                    <ConnectorStatus status={status} />
                  </span>
                </button>
              );
            })
          )}
        </section>

        {selected && (
          <aside className="space-y-4">
            <section
              className="p-5"
              style={{
                background: 'var(--a-card)',
                border: '1px solid var(--a-border)',
                borderRadius: 'var(--t-radius-lg)',
                boxShadow: 'var(--t-card-shadow)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: selected.accent, fontFamily: theme.fontMono }}>
                    Active connector
                  </p>
                  <h2 className="mt-2 text-xl font-black" style={{ color: 'var(--t-fg-95)' }}>{selected.label}</h2>
                </div>
                <ConnectorStatus status={selectedStatus} />
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--t-fg-55)' }}>{selected.summary}</p>

              <div className="mt-5 grid gap-2">
                <button
                  onClick={() => runConnectorAction(selected.id, selectedStatus === 'connected' ? 'Test connection' : 'Connect workspace')}
                  className="min-h-11 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selectedStatus === 'syncing'}
                  style={{ background: selected.accent, color: readableOn(selected.accent) }}
                >
                  {selectedStatus === 'syncing' ? 'Running check...' : selectedStatus === 'connected' ? 'Test connection' : 'Connect workspace'}
                </button>
                <button
                  onClick={() => runConnectorAction(selected.id, selected.actions[0] ?? 'Sync connector')}
                  className="min-h-11 rounded-lg border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selectedStatus === 'syncing'}
                  style={{
                    background: `${selected.accent}12`,
                    borderColor: `${selected.accent}34`,
                    color: selected.accent,
                  }}
                >
                  {selected.actions[0] ?? 'Sync connector'}
                </button>
                <Link
                  href={`/admin/integrations/${selected.id}`}
                  className="flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-bold transition"
                  style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)', color: 'var(--t-fg-85)' }}
                >
                  Open workspace
                </Link>
              </div>
            </section>

            <section
              className="p-5"
              style={{
                background: 'var(--a-card)',
                border: '1px solid var(--a-border)',
                borderRadius: 'var(--t-radius-lg)',
              }}
            >
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
                Activity
              </p>
              <div className="space-y-3">
                {activity.map((item, index) => (
                  <div key={`${item}-${index}`} className="grid grid-cols-[10px,1fr] gap-3 text-sm leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>
                    <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ background: index === 0 ? theme.accent : 'var(--t-fg-25)' }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
