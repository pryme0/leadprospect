'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getIntegrationById } from '@/lib/integrations';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--t-fg-95)' }}>{title}</h2>
        {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--t-fg-40)' }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-sm)',
        boxShadow: 'var(--t-card-shadow)',
      }}
    >
      {children}
    </div>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        background: connected ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.12)',
        borderColor: connected ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.28)',
        color: connected ? '#059669' : '#b45309',
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: connected ? '#10b981' : '#f59e0b' }} />
      {connected ? 'Connected' : 'Needs setup'}
    </span>
  );
}

const disconnectedKeys = new Set(['SALESFORCE_CLIENT_ID']);
type DatasetTab = 'pulls' | 'sends' | 'mappings' | 'outcomes';

function readableOn(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '#112126';
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#112126' : '#ffffff';
}

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>();
  const theme = useWorkspaceTheme();
  const integration = getIntegrationById(params.id);
  const [activeTab, setActiveTab] = useState<DatasetTab>('pulls');
  const [connected, setConnected] = useState(() => (integration ? !disconnectedKeys.has(integration.key) : false));
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [records, setRecords] = useState(() => integration?.records ?? []);
  const [selectedMapping, setSelectedMapping] = useState(() => integration?.mappings[0]?.source ?? '');
  const [activity, setActivity] = useState<string[]>(() => {
    if (!integration) return [];
    return [
      `${integration.label} workspace opened with ${integration.pulls.length} pull datasets and ${integration.sends.length} writeback jobs.`,
      connected ? 'Connection is healthy on demo credentials.' : 'Connection needs setup before live sync can run.',
    ];
  });

  if (!integration) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <Link href="/admin/settings" className="text-sm transition-colors" style={{ color: 'var(--t-fg-45)' }}>
          Back to integrations
        </Link>
        <div
          className="mt-6 p-8"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
            boxShadow: 'var(--t-card-shadow)',
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
            Unknown connector
          </p>
          <h1 className="mt-3 text-2xl font-bold" style={{ color: 'var(--t-fg-95)' }}>Integration not found</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--t-fg-45)' }}>
            This connector is not part of the current ProspectGrid workspace.
          </p>
        </div>
      </div>
    );
  }

  const activeIntegration = integration;

  function appendActivity(message: string) {
    setActivity((current) => [message, ...current].slice(0, 6));
  }

  function runAction(action: string) {
    const integrationCategory = activeIntegration.category.replace('-', ' ');
    setRunningAction(action);
    appendActivity(`${action} started.`);

    window.setTimeout(() => {
      setConnected(true);
      setRunningAction(null);
      appendActivity(`${action} completed against demo ${integrationCategory} data.`);
    }, 850);
  }

  function updateRecord(id: string, status: string) {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, status } : record)));
    appendActivity(`${id} marked as ${status.toLowerCase()}.`);
  }

  const tabs: Array<{ id: DatasetTab; label: string; count: number }> = [
    { id: 'pulls', label: 'Data pulled', count: integration.pulls.length },
    { id: 'sends', label: 'Writebacks', count: integration.sends.length },
    { id: 'mappings', label: 'Field mapping', count: integration.mappings.length },
    { id: 'outcomes', label: 'Lead outcomes', count: records.length },
  ];

  return (
    <div className="max-w-[1480px] mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/settings" className="transition-colors" style={{ color: 'var(--t-fg-45)' }}>
          Integrations
        </Link>
        <span style={{ color: 'var(--t-fg-20)' }}>/</span>
        <span style={{ color: 'var(--t-fg-70)' }}>{integration.label}</span>
      </div>

      <header
        className="pg-on-dark grid xl:grid-cols-[1fr,360px] gap-5 overflow-hidden"
        style={{
          background: '#112126',
          borderRadius: 'var(--t-radius-lg)',
          border: '1px solid rgba(16,21,16,0.18)',
          boxShadow: '0 28px 70px -42px rgba(16,21,16,0.55)',
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-black"
              style={{
                background: `${integration.accent}18`,
                borderColor: `${integration.accent}40`,
                color: integration.accent,
              }}
            >
              {integration.icon}
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/45" style={{ fontFamily: theme.fontMono }}>
                {integration.category.replace('-', ' ')}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{integration.label}</h1>
            </div>
            <div className="ml-auto">
              <StatusPill connected={connected} />
            </div>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-white/60 max-w-3xl">
            {integration.summary}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                background: '#00CEC8',
                color: '#112126',
                border: '1px solid rgba(0,206,200,0.3)',
                borderRadius: 'var(--t-radius-sm)',
              }}
            >
              Official API docs
            </a>
            {integration.actions.map((action, index) => (
              <button
                key={action}
                onClick={() => runAction(action)}
                disabled={runningAction !== null}
                className="px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  background: runningAction === action ? `${integration.accent}24` : 'rgba(255,255,255,0.08)',
                  color: runningAction === action ? readableOn(integration.accent) : 'rgba(255,255,255,0.82)',
                  border: `1px solid ${runningAction === action ? integration.accent : 'rgba(255,255,255,0.14)'}`,
                  borderRadius: 'var(--t-radius-sm)',
                  opacity: runningAction && runningAction !== action ? 0.55 : 1,
                }}
              >
                {runningAction === action ? 'Running...' : action}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-1 gap-px bg-white/10">
          {integration.metrics.map((metric) => (
            <div key={metric.label} className="bg-[#112126] px-5 py-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-white">{metric.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45" style={{ fontFamily: theme.fontMono }}>
                {metric.label}
              </p>
              <p className="mt-1 text-xs text-white/35">{metric.detail}</p>
            </div>
          ))}
        </div>
      </header>

      <Section title="API Notes" subtitle="Important implementation constraints for this connector.">
        <Panel className="p-4">
          <ul className="space-y-3">
            {integration.apiNotes.map((note) => (
              <li key={note} className="grid grid-cols-[18px,1fr] gap-3 text-sm leading-relaxed" style={{ color: 'var(--t-fg-70)' }}>
                <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ background: integration.accent }} />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </Section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),360px]">
        <section
          className="overflow-hidden"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
            boxShadow: 'var(--t-card-shadow)',
          }}
        >
          <div className="flex flex-wrap gap-2 border-b p-3" style={{ borderColor: 'var(--a-border)' }}>
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="min-h-11 rounded-lg border px-3 text-sm font-semibold transition"
                  style={{
                    background: active ? `${integration.accent}12` : 'var(--a-card2)',
                    borderColor: active ? `${integration.accent}42` : 'var(--a-border)',
                    color: active ? integration.accent : 'var(--t-fg-70)',
                  }}
                >
                  {tab.label}
                  <span className="ml-2 rounded px-1.5 py-0.5 text-[10px]" style={{ background: active ? `${integration.accent}18` : 'var(--t-fg-06)' }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {activeTab === 'pulls' && (
              <div className="space-y-3">
                {integration.pulls.map((dataset) => (
                  <DatasetCard key={dataset.name} dataset={dataset} tone="Pull" accent={integration.accent} theme={theme} />
                ))}
              </div>
            )}

            {activeTab === 'sends' && (
              <div className="space-y-3">
                {integration.sends.map((dataset) => (
                  <DatasetCard key={dataset.name} dataset={dataset} tone="Write" accent={integration.accent} theme={theme} />
                ))}
              </div>
            )}

            {activeTab === 'mappings' && (
              <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
                <div className="space-y-2">
                  {integration.mappings.map((mapping) => {
                    const active = mapping.source === selectedMapping;
                    return (
                      <button
                        key={mapping.source}
                        onClick={() => setSelectedMapping(mapping.source)}
                        className="w-full rounded-lg border p-3 text-left text-sm font-semibold transition"
                        style={{
                          background: active ? `${integration.accent}12` : 'var(--a-card2)',
                          borderColor: active ? `${integration.accent}44` : 'var(--a-border)',
                          color: active ? integration.accent : 'var(--t-fg-85)',
                        }}
                      >
                        {mapping.source}
                      </button>
                    );
                  })}
                </div>
                {integration.mappings.filter((mapping) => mapping.source === selectedMapping).map((mapping) => (
                  <div key={`${mapping.source}-${mapping.destination}`} className="rounded-xl border p-5" style={{ borderColor: 'var(--a-border)', background: 'var(--a-card2)' }}>
                    <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>Source field</p>
                    <p className="mt-1 font-mono text-base font-bold" style={{ color: 'var(--t-fg-95)' }}>{mapping.source}</p>
                    <div className="my-5 h-px" style={{ background: 'var(--a-border)' }} />
                    <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>ProspectGrid field</p>
                    <p className="mt-1 font-mono text-base font-bold" style={{ color: 'var(--t-fg-95)' }}>{mapping.destination}</p>
                    <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--t-fg-55)' }}>{mapping.rule}</p>
                    <button
                      onClick={() => appendActivity(`${mapping.source} mapping validated against ${mapping.destination}.`)}
                      className="mt-5 min-h-11 rounded-lg px-4 text-sm font-bold"
                      style={{ background: integration.accent, color: readableOn(integration.accent) }}
                    >
                      Validate mapping
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'outcomes' && (
              <div className="divide-y overflow-hidden rounded-xl border" style={{ borderColor: 'var(--a-border)' }}>
                {records.map((record) => (
                  <div key={record.id} className="grid gap-4 p-4 md:grid-cols-[90px,1fr,auto] md:items-center" style={{ borderColor: 'var(--a-border)' }}>
                    <span className="text-xs font-mono" style={{ color: 'var(--t-fg-35)' }}>{record.id}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--t-fg-95)' }}>{record.title}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--t-fg-45)' }}>{record.detail}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <span className="font-bold tabular-nums" style={{ color: 'var(--t-fg-95)' }}>{record.score}</span>
                      <span
                        className="px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]"
                        style={{
                          background: `${integration.accent}12`,
                          color: integration.accent,
                          borderRadius: '999px',
                          fontFamily: theme.fontMono,
                        }}
                      >
                        {record.status}
                      </span>
                      <button
                        onClick={() => updateRecord(record.id, 'Routed')}
                        className="min-h-9 rounded-lg border px-3 text-xs font-bold"
                        style={{ borderColor: `${integration.accent}34`, color: integration.accent, background: `${integration.accent}10` }}
                      >
                        Route
                      </button>
                      <button
                        onClick={() => updateRecord(record.id, 'Suppressed')}
                        className="min-h-9 rounded-lg border px-3 text-xs font-bold"
                        style={{ borderColor: 'var(--a-border)', color: 'var(--t-fg-60)', background: 'var(--a-card2)' }}
                      >
                        Suppress
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <Panel className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
              Workspace Activity
            </p>
            <div className="mt-4 space-y-3">
              {activity.map((item, index) => (
                <div key={`${item}-${index}`} className="grid grid-cols-[12px,1fr] gap-3 text-sm leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>
                  <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ background: index === 0 ? integration.accent : 'var(--t-fg-25)' }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
              Quick test
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--t-fg-55)' }}>
              Run the first connector action to simulate a setup check and update the workspace status.
            </p>
            <button
              onClick={() => runAction(integration.actions[0] ?? 'Run connector test')}
              disabled={runningAction !== null}
              className="mt-4 min-h-11 w-full rounded-lg px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: integration.accent, color: readableOn(integration.accent) }}
            >
              {runningAction ? 'Running...' : integration.actions[0] ?? 'Run connector test'}
            </button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function DatasetCard({
  dataset,
  tone,
  accent,
  theme,
}: {
  dataset: { name: string; fields: string[]; cadence: string };
  tone: 'Pull' | 'Write';
  accent: string;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  const write = tone === 'Write';

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--t-fg-95)' }}>{dataset.name}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--t-fg-40)' }}>Cadence: {dataset.cadence}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: write ? accent : 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
          {tone}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {dataset.fields.map((field) => (
          <span
            key={field}
            className="px-2.5 py-1 text-[11px] font-mono"
            style={{
              background: write ? `${accent}10` : 'var(--a-card)',
              border: `1px solid ${write ? `${accent}22` : 'var(--a-border)'}`,
              borderRadius: '999px',
              color: write ? accent : 'var(--t-fg-60)',
            }}
          >
            {field}
          </span>
        ))}
      </div>
    </div>
  );
}
