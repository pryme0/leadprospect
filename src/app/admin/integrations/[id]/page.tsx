'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface CredField { key: string; label: string; type: 'text' | 'password'; placeholder?: string; optional?: boolean; help?: string }
interface ConnectorMeta { oauth: boolean; provider_configured: boolean; has_credentials: boolean; fields: CredField[]; account_label: string | null; source: 'oauth' | 'env' | null }

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface LiveRecord { id: string; name: string; email: string; company: string; status: string; source: string; created_at: string; type: string }

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>();
  const theme = useWorkspaceTheme();
  const integration = getIntegrationById(params.id);
  const [activeTab, setActiveTab] = useState<DatasetTab>('pulls');
  const [connected, setConnected] = useState(false);
  const [meta, setMeta] = useState<ConnectorMeta | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [records, setRecords] = useState(() => integration?.records ?? []);
  const [selectedMapping, setSelectedMapping] = useState(() => integration?.mappings[0]?.source ?? '');
  const [activity, setActivity] = useState<string[]>([]);
  const [liveRecords, setLiveRecords] = useState<LiveRecord[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [showCreds, setShowCreds] = useState(false);
  const [credInput, setCredInput] = useState<Record<string, string>>({});
  const [savingCreds, setSavingCreds] = useState(false);

  /* Real connection status — per-user OAuth connection + server config. */
  const loadStatus = useCallback(() => {
    if (!integration) return;
    fetch('/api/settings/integrations', { cache: 'no-store', headers: authHeaders() })
      .then((r) => r.json())
      .then((data: { statuses?: Record<string, string>; meta?: Record<string, ConnectorMeta> }) => {
        const ok = data.statuses?.[integration.id] === 'connected';
        setConnected(ok);
        setMeta(data.meta?.[integration.id] ?? null);
        setActivity(ok ? [`${integration.label} is connected.`] : []);
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [integration]);

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 30_000);
    return () => clearInterval(id);
  }, [loadStatus]);

  /* OAuth return handler (?connected / ?error) — same params the list page uses. */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('connected')) { setNotice({ kind: 'ok', text: 'Connected successfully.' }); loadStatus(); }
    else if (p.get('error')) { setNotice({ kind: 'err', text: `Connection failed: ${p.get('error')!.replace(/_/g, ' ')}` }); }
    if (p.get('connected') || p.get('error')) window.history.replaceState({}, '', window.location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(() => {
    if (!integration) return;
    setBusy(true); setNotice(null);
    fetch(`/api/integrations/${integration.id}/connect`, { headers: authHeaders() })
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (ok && body.url) { window.location.href = body.url; return; }
        if (body.needs_credentials) { setShowCreds(true); setNotice({ kind: 'err', text: 'Enter your app credentials below, then connect.' }); }
        else setNotice({ kind: 'err', text: body.message || 'Could not start the connection.' });
        setBusy(false);
      })
      .catch(() => { setNotice({ kind: 'err', text: 'Could not start the connection.' }); setBusy(false); });
  }, [integration]);

  const saveCreds = useCallback(() => {
    if (!integration) return;
    setSavingCreds(true); setNotice(null);
    fetch(`/api/integrations/${integration.id}/credentials`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(credInput),
    })
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (ok) { setNotice({ kind: 'ok', text: 'Credentials saved — you can connect now.' }); setShowCreds(false); setCredInput({}); loadStatus(); }
        else setNotice({ kind: 'err', text: body.message || 'Could not save credentials.' });
      })
      .catch(() => setNotice({ kind: 'err', text: 'Could not save credentials.' }))
      .finally(() => setSavingCreds(false));
  }, [integration, credInput, loadStatus]);

  const disconnect = useCallback(() => {
    if (!integration) return;
    setBusy(true); setNotice(null);
    fetch(`/api/integrations/${integration.id}/disconnect`, { method: 'POST', headers: authHeaders() })
      .then(() => { setNotice({ kind: 'ok', text: 'Disconnected.' }); setLiveRecords(null); loadStatus(); })
      .catch(() => setNotice({ kind: 'err', text: 'Could not disconnect.' }))
      .finally(() => setBusy(false));
  }, [integration, loadStatus]);

  const syncNow = useCallback(() => {
    if (!integration) return;
    setSyncing(true); setNotice(null);
    fetch(`/api/integrations/${integration.id}/sync`, { headers: authHeaders() })
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (ok) { setLiveRecords(body.records ?? []); setNotice({ kind: 'ok', text: `Pulled ${body.count ?? 0} live records.` }); }
        else setNotice({ kind: 'err', text: body.message || 'Sync failed.' });
      })
      .catch(() => setNotice({ kind: 'err', text: 'Sync failed.' }))
      .finally(() => setSyncing(false));
  }, [integration]);

  if (!integration) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <Link href="/admin/integrations" className="text-sm transition-colors" style={{ color: 'var(--t-fg-45)' }}>
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
            This connector is not part of the current SYNQ workspace.
          </p>
        </div>
      </div>
    );
  }

  function appendActivity(message: string) {
    setActivity((current) => [message, ...current].slice(0, 6));
  }

  function updateRecord(id: string, status: string) {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, status } : record)));
    appendActivity(`${id} marked as ${status.toLowerCase()}.`);
  }

  const tabs: Array<{ id: DatasetTab; label: string; count: number }> = [
    { id: 'pulls', label: 'Data pulled', count: integration.pulls.length },
    { id: 'sends', label: 'Writebacks', count: integration.sends.length },
    { id: 'mappings', label: 'Field mapping', count: integration.mappings.length },
    { id: 'outcomes', label: 'Lead outcomes', count: connected ? records.length : 0 },
  ];

  return (
    <div className="max-w-[1480px] mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/integrations" className="transition-colors" style={{ color: 'var(--t-fg-45)' }}>
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
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 'var(--t-radius-sm)' }}
            >
              API docs ↗
            </a>

            {meta?.oauth ? (
              connected && meta?.source === 'oauth' ? (
                <>
                  <button
                    onClick={syncNow}
                    disabled={syncing}
                    className="px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                    style={{ background: '#00CEC8', color: '#112126', border: '1px solid rgba(0,206,200,0.3)', borderRadius: 'var(--t-radius-sm)' }}
                  >
                    {syncing ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    onClick={disconnect}
                    disabled={busy}
                    className="px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--t-radius-sm)' }}
                  >
                    {busy ? 'Working…' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={connect}
                    disabled={busy}
                    className="px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                    style={{ background: '#00CEC8', color: '#112126', border: '1px solid rgba(0,206,200,0.3)', borderRadius: 'var(--t-radius-sm)' }}
                  >
                    {busy ? 'Redirecting…' : `Connect ${integration.label}`}
                  </button>
                  <button
                    onClick={() => setShowCreds((s) => !s)}
                    className="px-4 py-2 text-sm font-semibold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 'var(--t-radius-sm)' }}
                  >
                    {meta?.has_credentials ? 'Update credentials' : 'Add credentials'}
                  </button>
                </>
              )
            ) : (
              <button
                onClick={loadStatus}
                className="px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 'var(--t-radius-sm)' }}
              >
                Recheck configuration
              </button>
            )}
          </div>

          {notice && (
            <div
              className="mt-3 rounded-lg px-3 py-2 text-[12px] font-medium"
              style={{ background: notice.kind === 'ok' ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)', color: notice.kind === 'ok' ? '#34d399' : '#fca5a5' }}
            >
              {notice.text}
            </div>
          )}

          {meta?.oauth && showCreds && (
            <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <p className="text-[13px] font-semibold text-white">Your {integration.label} app credentials</p>
              <p className="mt-1 text-[12px] text-white/45">
                Create your own OAuth app on {integration.label} and paste its credentials. Set the callback / redirect URI to{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-white/70">{`${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/${integration.id}/callback`}</code>.
                {meta.has_credentials && <span className="ml-1 text-emerald-400">Saved — re-enter the secret only to change it.</span>}
              </p>
              <div className="mt-3 grid gap-3">
                {(meta.fields ?? []).map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-[11px] font-medium text-white/60">{f.label}{f.optional ? ' (optional)' : ''}</span>
                    <input
                      type={f.type}
                      value={credInput[f.key] ?? ''}
                      onChange={(e) => setCredInput((c) => ({ ...c, [f.key]: e.target.value }))}
                      placeholder={f.type === 'password' && meta.has_credentials ? '•••••••• (unchanged)' : f.placeholder}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                      style={{ background: 'var(--a-input-bg, rgba(0,0,0,0.25))', border: '1px solid rgba(255,255,255,0.16)', color: '#fff' }}
                    />
                    {f.help && <span className="mt-0.5 block text-[10px] text-white/35">{f.help}</span>}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={saveCreds}
                  disabled={savingCreds}
                  className="px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                  style={{ background: '#00CEC8', color: '#112126', borderRadius: 'var(--t-radius-sm)' }}
                >
                  {savingCreds ? 'Saving…' : 'Save credentials'}
                </button>
                <button
                  onClick={() => { setShowCreds(false); setCredInput({}); }}
                  className="px-4 py-2 text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 'var(--t-radius-sm)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {liveRecords && (
            <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50" style={{ background: 'rgba(255,255,255,0.04)', fontFamily: theme.fontMono }}>
                Live records · {liveRecords.length}
              </div>
              {liveRecords.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-white/40">No records returned from the connected account.</p>
              ) : (
                <div className="max-h-[320px] overflow-y-auto divide-y divide-white/5">
                  {liveRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-white">{r.name || '(no name)'}</p>
                        <p className="truncate text-[11px] text-white/45">{[r.email, r.company].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(0,206,200,0.14)', color: '#00CEC8' }}>{r.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-1 gap-px bg-white/10">
          {connected ? (
            integration.metrics.map((metric) => (
              <div key={metric.label} className="bg-[#112126] px-5 py-4">
                <p className="text-2xl font-bold tracking-tight tabular-nums text-white">{metric.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45" style={{ fontFamily: theme.fontMono }}>
                  {metric.label}
                </p>
                <p className="mt-1 text-xs text-white/35">{metric.detail}</p>
              </div>
            ))
          ) : (
            <div className="bg-[#112126] px-5 py-6">
              <p className="text-sm font-semibold text-white/70">
                {statusLoading ? 'Checking connection…' : 'No live metrics yet'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Connect {integration.label} to stream real metrics here — set{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-white/60">{integration.key}</code> on the server.
              </p>
            </div>
          )}
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
                    <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>SYNQ field</p>
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

            {activeTab === 'outcomes' && !connected && (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--a-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--t-fg-95)' }}>No lead outcomes yet</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--t-fg-45)' }}>
                  Connect {integration.label} to see real routed and suppressed leads here.
                </p>
              </div>
            )}

            {activeTab === 'outcomes' && connected && (
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
              {connected && meta?.oauth ? 'Live sync' : 'Connection check'}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--t-fg-55)' }}>
              {connected && meta?.oauth
                ? 'Pull the latest records from the connected account right now.'
                : 'Re-check this connector against the current server/account configuration.'}
            </p>
            <button
              onClick={() => (connected && meta?.oauth ? syncNow() : loadStatus())}
              disabled={syncing || busy}
              className="mt-4 min-h-11 w-full rounded-lg px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: integration.accent, color: readableOn(integration.accent) }}
            >
              {syncing ? 'Syncing…' : connected && meta?.oauth ? 'Sync now' : 'Recheck configuration'}
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
