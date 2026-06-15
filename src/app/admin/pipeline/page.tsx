'use client';

import { useState, useEffect, useCallback } from 'react';
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
  url: string;
  timestamp: string;
  intent_level: string;
  intent_category: string;
  pain_points: string[];
  urgency_score: number;
  summary: string;
  processed: boolean;
  created_at: string;
  classified_at: string | null;
  enriched_name?: string | null;
  enriched_email?: string | null;
  enriched_phone?: string | null;
  enriched_company?: string | null;
  enriched_title?: string | null;
  enriched_linkedin_url?: string | null;
  enriched_via?: string | null;
  enriched_at?: string | null;
  ghl_contact_id?: string | null;
}

interface IngestStatus {
  running: boolean;
  lastCount: number | null;
  lastRun: Date | null;
  error: string | null;
}

interface ClassifyStatus {
  running: boolean;
  lastCount: number | null;
  lastRun: Date | null;
  error: string | null;
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

const PLATFORMS = [
  { id: 'google', label: 'Google Ads', desc: 'Search terms, campaigns, and conversion events' },
  { id: 'linkedin', label: 'LinkedIn Ads', desc: 'Company intent, job roles, and buying committees' },
  { id: 'instagram', label: 'Instagram Ads', desc: 'Lead forms, retargeting audiences, and DMs' },
  { id: 'tiktok', label: 'TikTok Ads', desc: 'Short-form campaign leads and territory demand' },
] as const;

type Platform = typeof PLATFORMS[number]['id'];

export default function PipelinePage() {
  const theme = useWorkspaceTheme();
  const [ingestStatus, setIngestStatus] = useState<Record<Platform, IngestStatus>>({
    google: { running: false, lastCount: null, lastRun: null, error: null },
    linkedin: { running: false, lastCount: null, lastRun: null, error: null },
    instagram: { running: false, lastCount: null, lastRun: null, error: null },
    tiktok: { running: false, lastCount: null, lastRun: null, error: null },
  });

  const [classifyStatus, setClassifyStatus] = useState<ClassifyStatus>({
    running: false, lastCount: null, lastRun: null, error: null,
  });

  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [signalFilter, setSignalFilter] = useState<'all' | 'unprocessed' | 'high'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | Platform>('all');
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const [unprocessedCount, setUnprocessedCount] = useState<number | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const FEED_PAGE_SIZE = 20;

  const fetchStats = useCallback(async () => {
    try {
      // Use the dedicated stats endpoint instead of filter+count on getSignals
      // — the latter goes through the QuerySignalsDto which (until the deploy
      // ships) string-coerces ?processed=false into TRUE, returning the
      // processed-count instead of pending. getSignalStats does its own
      // server-side boolean count and is unaffected.
      const statsRes = await adminApi.getSignalStats();
      setUnprocessedCount(statsRes.data.pending ?? 0);
    } catch { /* leave previous count in place */ }
  }, []);

  const fetchSignals = useCallback(async () => {
    setSignalsLoading(true);
    setSignalsError(null);
    try {
      const params: any = { limit: FEED_PAGE_SIZE, offset: (feedPage - 1) * FEED_PAGE_SIZE };
      if (signalFilter === 'unprocessed') params.processed = 'false';
      if (signalFilter === 'high') params.intent_level = 'HIGH_INTENT';
      if (sourceFilter !== 'all') params.source = sourceFilter;
      const res = await adminApi.getSignals(params);
      const list: Signal[] = res.data.signals || res.data.data || [];
      setSignals(list);
      setFeedTotal(res.data.total || list.length);
      fetchStats();
    } catch (err: any) {
      const msg = err?.response?.data?.message?.toString() || err?.message || 'Failed to load signals';
      setSignalsError(Array.isArray(msg) ? msg.join('; ') : msg);
      setSignals([]);
      setFeedTotal(0);
    } finally {
      setSignalsLoading(false);
    }
  }, [signalFilter, sourceFilter, feedPage, fetchStats]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // Poll the pending-classification count so the big number on this page
  // tracks the cron's progress without forcing a full feed refetch. Pause
  // when the tab is hidden so we don't burn requests in the background.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };
    const id = window.setInterval(tick, 10_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fetchStats]);

  const triggerIngest = async (platform: Platform) => {
    setIngestStatus((prev) => ({ ...prev, [platform]: { ...prev[platform], running: true, error: null } }));
    try {
      const res = await adminApi.triggerIngest(platform);
      const count = res.data?.count ?? res.data?.saved ?? 0;
      setIngestStatus((prev) => ({ ...prev, [platform]: { running: false, lastCount: count, lastRun: new Date(), error: null } }));
      fetchSignals();
    } catch (err: any) {
      setIngestStatus((prev) => ({ ...prev, [platform]: { ...prev[platform], running: false, error: err.response?.data?.message || 'Ingestion failed' } }));
    }
  };

  const triggerClassify = async () => {
    setClassifyStatus({ running: true, lastCount: null, lastRun: null, error: null });
    try {
      const res = await adminApi.classifyBatch();
      const count = res.data?.classified ?? 0;
      setClassifyStatus({ running: false, lastCount: count, lastRun: new Date(), error: null });
      fetchSignals();
    } catch (err: any) {
      setClassifyStatus({ running: false, lastCount: null, lastRun: null, error: err.response?.data?.message || 'Classification failed' });
    }
  };

  const classifySingle = async (signal: Signal) => {
    try {
      const res = await adminApi.classifySignal(signal.id);
      const updated: Signal = res.data?.data || signal;
      setSignals((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSignal?.id === updated.id) setSelectedSignal(updated);
    } catch { /* silent */ }
  };

  const sourceColor = (s: string) => theme.platform[s] || theme.chart[3];
  const highIntentCount = signals.filter((signal) => signal.intent_level === 'HIGH_INTENT').length;
  const processedCount = signals.filter((signal) => signal.processed).length;

  return (
    <div className="space-y-7 max-w-[1280px] mx-auto">
      {/* Header */}
      <header
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr),auto]"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          padding: '20px 24px',
          boxShadow: 'var(--t-card-shadow)',
        }}
      >
        <div>
          <p
            className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em]"
            style={{ color: theme.accent, fontFamily: theme.fontMono }}
          >
            05 · Signal pipeline
          </p>
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: 'var(--t-fg-95)' }}>
            Source and scoring pipeline
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>
            Monitor each lead source, run scoring when needed, and inspect the latest signals before they enter routing.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <HeaderStat label="Feed" value={signals.length} theme={theme} />
          <HeaderStat label="Scored" value={processedCount} theme={theme} />
          <HeaderStat label="High intent" value={highIntentCount} theme={theme} tone="hot" />
        </div>
      </header>

      {/* MODULE 01 — INGESTION */}
      <section>
        <SectionHeader ord="01" title="Source ingestion" subtitle="Auto-runs every 10 minutes. Manual runs are for fresh campaign pulls." theme={theme} />

        <div className="overflow-hidden" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', borderRadius: 'var(--t-radius-lg)' }}>
          <div className="grid grid-cols-[minmax(190px,1fr),130px,120px,130px,110px] items-center border-b px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: 'var(--a-border)', color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
            <span>Source</span>
            <span>Status</span>
            <span className="text-right">Last pull</span>
            <span className="text-right">Records</span>
            <span className="text-right">Action</span>
          </div>
          {PLATFORMS.map((p) => {
            const st = ingestStatus[p.id];
            const color = sourceColor(p.id);
            return (
              <div key={p.id} className="grid grid-cols-[minmax(190px,1fr),130px,120px,130px,110px] items-center border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--a-border)' }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--t-fg-95)' }}>{p.label}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--t-fg-60)' }}>{p.desc}</p>
                  {st.error && <p className="mt-1 text-xs text-red-400">{st.error}</p>}
                </div>
                <StatusPill running={st.running} theme={theme} />
                <span className="text-right text-xs tabular-nums" style={{ color: 'var(--t-fg-60)', fontFamily: theme.fontMono }}>
                  {st.lastRun ? `${timeAgo(st.lastRun)} ago` : 'Idle'}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums" style={{ color: st.lastCount ? color : 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
                  {st.lastCount !== null ? `+${st.lastCount}` : '—'}
                </span>
                <div className="flex justify-end">
                  <button
                    onClick={() => triggerIngest(p.id)}
                    disabled={st.running}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--t-accent-soft)', color: theme.accent, border: '1px solid var(--t-accent-soft)', fontFamily: theme.fontMono }}
                  >
                    {st.running ? 'Running' : 'Run'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODULE 02 — CLASSIFICATION */}
      <section>
        <SectionHeader ord="02" title="Lead scoring" subtitle="Scores each signal for fit, urgency, and routing priority · batch of 50" theme={theme} />

        <div
          className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr),auto]"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
          }}
        >
          <div>
            <p
              className="mb-2 text-[10px] uppercase tracking-[0.24em]"
              style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
            >
              Pending classification
            </p>
            <p
              className="font-bold tabular-nums leading-none"
              style={{ fontSize: '36px', letterSpacing: '-0.02em', color: theme.intent.medium }}
            >
              {unprocessedCount !== null ? unprocessedCount.toLocaleString() : '—'}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: 'var(--t-fg-60)' }}>
              Signals waiting for scoring across intent, urgency, and routing blockers.
              Triggers automatically — manual run only when you need fresh data now.
            </p>

            {classifyStatus.lastRun && (
              <div className="flex items-center gap-2 mt-5 text-[10px] uppercase tracking-[0.22em]" style={{ fontFamily: theme.fontMono }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.accent }} />
                <span style={{ color: 'var(--t-fg-40)' }}>Last run · {timeAgo(classifyStatus.lastRun)} ago</span>
                {classifyStatus.lastCount !== null && (
                  <span style={{ color: theme.accent }}>· {classifyStatus.lastCount} classified</span>
                )}
              </div>
            )}

            {classifyStatus.error && (
              <div
                className="mt-4 px-3 py-2 text-[11px]"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.20)',
                  color: '#fca5a5',
                  borderRadius: 'var(--t-radius-sm)',
                }}
              >
                {classifyStatus.error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-start lg:justify-end">
            <button
              onClick={triggerClassify}
              disabled={classifyStatus.running || unprocessedCount === 0}
              className="inline-flex min-h-11 items-center gap-2 px-5 text-sm font-semibold tracking-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: theme.accent,
                color: theme.accentOn,
                borderRadius: 'var(--t-radius-sm)',
              }}
            >
              {classifyStatus.running ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Running batch
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Score batch now
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* SIGNAL FEED */}
      <section>
        <SectionHeader
          ord="03"
          title="Signal feed"
          subtitle="Live stream of recent signals — click any to inspect"
          theme={theme}
          right={
            <button
              onClick={fetchSignals}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] transition-colors hover:opacity-100"
              style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
              title="Refresh"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          }
        />

        {/* Filter bar */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-3 mb-3"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius)',
          }}
        >
          <span className="text-[10px] uppercase tracking-[0.25em] mr-2" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            Source
          </span>
          {(['all', ...PLATFORMS.map((p) => p.id)] as const).map((s) => (
            <SegmentBtn
              key={s}
              active={sourceFilter === s}
              onClick={() => { setSourceFilter(s); setFeedPage(1); }}
              theme={theme}
              dot={s !== 'all' ? sourceColor(s) : undefined}
            >
              {s}
            </SegmentBtn>
          ))}
          <div className="hidden sm:block w-px h-5 mx-2" style={{ background: 'var(--a-border2)' }} />
          <span className="text-[10px] uppercase tracking-[0.25em] mr-2" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            State
          </span>
          {([
            { v: 'all', label: 'All' },
            { v: 'unprocessed', label: 'Pending' },
            { v: 'high', label: 'High intent' },
          ] as const).map((f) => (
            <SegmentBtn
              key={f.v}
              active={signalFilter === f.v}
              onClick={() => { setSignalFilter(f.v); setFeedPage(1); }}
              theme={theme}
            >
              {f.label}
            </SegmentBtn>
          ))}
        </div>

        {signalsError && (
          <div
            className="px-4 py-3 text-sm flex items-start gap-3 mb-3"
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
            <span><span className="font-semibold uppercase tracking-[0.18em] text-[11px] mr-2" style={{ fontFamily: theme.fontMono }}>Failed</span>{signalsError}</span>
          </div>
        )}

        {signalsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--t-fg-06)', borderTopColor: theme.accent }}
            />
          </div>
        ) : signals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <div className="h-px w-12" style={{ background: 'var(--a-border2)' }} />
            <p className="text-sm" style={{ color: 'var(--t-fg-35)' }}>No signals yet</p>
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--t-fg-25)', fontFamily: theme.fontMono }}>
              Trigger an ingestion above
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-stagger>
            {signals.map((s) => (
              <SignalCard
                key={s.id}
                signal={s}
                theme={theme}
                selected={selectedSignal?.id === s.id}
                onSelect={() => setSelectedSignal(s)}
                onClassify={() => classifySingle(s)}
              />
            ))}
          </div>
        )}

        {!signalsLoading && feedTotal > FEED_PAGE_SIZE && (
          <div className="flex items-center justify-between mt-5">
            <p
              className="text-[10px] uppercase tracking-[0.25em] tabular-nums"
              style={{ fontFamily: theme.fontMono }}
            >
              Page {String(feedPage).padStart(2, '0')} / {String(Math.ceil(feedTotal / FEED_PAGE_SIZE)).padStart(2, '0')}
              <span className="ml-2" style={{ color: 'var(--t-fg-25)' }}>· {feedTotal.toLocaleString()} total</span>
            </p>
            <div className="flex gap-2">
              <PaginationButton
                onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                disabled={feedPage === 1}
                theme={theme}
              >
                ← Prev
              </PaginationButton>
              <PaginationButton
                onClick={() => setFeedPage((p) => Math.min(Math.ceil(feedTotal / FEED_PAGE_SIZE), p + 1))}
                disabled={feedPage === Math.ceil(feedTotal / FEED_PAGE_SIZE)}
                theme={theme}
              >
                Next →
              </PaginationButton>
            </div>
          </div>
        )}
      </section>

      {/* DETAIL DRAWER */}
      {selectedSignal && (
        <DetailDrawer
          signal={selectedSignal}
          theme={theme}
          onClose={() => setSelectedSignal(null)}
          onClassify={() => classifySingle(selectedSignal)}
        />
      )}
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function SectionHeader({
  ord, title, subtitle, theme, right,
}: {
  ord: string;
  title: string;
  subtitle?: string;
  theme: ReturnType<typeof useWorkspaceTheme>;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="flex items-baseline gap-3">
        <span className="tabular-nums text-[10px] tracking-[0.3em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
          {ord}
        </span>
        <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
        <div>
          <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--t-fg-95)' }}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--t-fg-35)' }}>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function HeaderStat({
  label, value, theme, tone,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof useWorkspaceTheme>;
  tone?: 'hot';
}) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--a-hover2)', border: '1px solid var(--a-border)' }}>
      <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}>{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: tone === 'hot' ? theme.intent.high : 'var(--t-fg-95)', fontFamily: theme.fontMono }}>{value.toLocaleString()}</p>
    </div>
  );
}

function StatusPill({ running, theme }: { running: boolean; theme: ReturnType<typeof useWorkspaceTheme> }) {
  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{
        background: running ? 'rgba(255,156,95,0.14)' : 'rgba(16,185,129,0.12)',
        color: running ? theme.intent.medium : '#10b981',
        fontFamily: theme.fontMono,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: running ? theme.intent.medium : '#10b981' }} />
      {running ? 'Running' : 'Ready'}
    </span>
  );
}

function SegmentBtn({
  children, active, onClick, theme, dot,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  theme: ReturnType<typeof useWorkspaceTheme>;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors capitalize"
      style={{
        fontFamily: theme.fontMono,
        background: active ? 'var(--t-accent-soft)' : 'var(--a-hover2)',
        color: active ? theme.accent : 'var(--t-fg-55)',
        border: `1px solid ${active ? 'var(--t-accent-soft)' : 'var(--a-border2)'}`,
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function PaginationButton({
  children, onClick, disabled, theme,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

function ToneBadge({
  children, tone, theme, title,
}: {
  children: React.ReactNode;
  tone: 'accent' | 'green' | 'gold' | 'blue' | 'red';
  theme: ReturnType<typeof useWorkspaceTheme>;
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

function IntentBadge({ level, theme }: { level: string | null; theme: ReturnType<typeof useWorkspaceTheme> }) {
  if (!level) return <ToneBadge tone="blue" theme={theme}>Unclassified</ToneBadge>;
  const tone: 'red' | 'gold' | 'blue' =
    level === 'HIGH_INTENT' ? 'red' : level === 'MEDIUM_INTENT' ? 'gold' : 'blue';
  return <ToneBadge tone={tone} theme={theme}>{level.replace('_INTENT', '').toLowerCase()}</ToneBadge>;
}

function UrgencyMeter({ score, theme }: { score: number; theme: ReturnType<typeof useWorkspaceTheme> }) {
  const color = score >= 70 ? theme.intent.high : score >= 40 ? theme.intent.medium : theme.intent.low;
  return (
    <div className="flex items-baseline justify-end gap-1">
      <span className="text-2xl font-bold tabular-nums leading-none" style={{ color, fontFamily: theme.fontMono }}>
        {score}
      </span>
      <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>urg</span>
    </div>
  );
}

function SignalCard({
  signal, theme, selected, onSelect, onClassify,
}: {
  signal: Signal;
  theme: ReturnType<typeof useWorkspaceTheme>;
  selected: boolean;
  onSelect: () => void;
  onClassify: () => void;
}) {
  const color = theme.platform[signal.source] || theme.chart[3];
  return (
    <div
      onClick={onSelect}
      className="grid cursor-pointer gap-4 p-4 transition-colors md:grid-cols-[180px,minmax(0,1fr),110px,110px]"
      style={{
        background: selected ? 'var(--t-accent-faint)' : 'var(--a-card)',
        border: `1px solid ${selected ? 'var(--t-accent-soft)' : 'var(--a-border)'}`,
        borderRadius: 'var(--t-radius)',
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
          <span
            className="text-[10px] uppercase tracking-[0.2em] capitalize"
            style={{ color: 'var(--t-fg-55)', fontFamily: theme.fontMono }}
          >
            {signal.source}
          </span>
        </div>
        <p className="mt-2 truncate text-sm font-semibold" style={{ color: 'var(--t-fg-95)' }}>
          {signal.name || (!/^ACoAA/i.test(signal.username || '') ? `@${signal.username}` : 'LinkedIn user')}
        </p>
        <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}>
          {new Date(signal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>

      <div className="min-w-0">
        <p className="line-clamp-2 text-sm leading-6" style={{ color: 'var(--t-fg-85)' }}>{signal.summary || signal.content}</p>
        {signal.pain_points?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {signal.pain_points.slice(0, 3).map((p, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5"
              style={{
                background: 'var(--a-hover2)',
                border: '1px solid var(--a-border2)',
                color: 'var(--t-fg-70)',
                borderRadius: 'var(--t-radius-sm)',
              }}
            >
              {p}
            </span>
          ))}
          {signal.pain_points.length > 3 && (
            <span
              className="text-[10px] px-2 py-0.5"
              style={{
                background: 'var(--a-hover2)',
                border: '1px solid var(--a-border2)',
                borderRadius: 'var(--t-radius-sm)',
                fontFamily: theme.fontMono,
              }}
            >
              +{signal.pain_points.length - 3}
            </span>
          )}
        </div>
        )}
      </div>

      <div className="flex items-center justify-start md:justify-end">
        {signal.processed && signal.urgency_score != null ? <UrgencyMeter score={signal.urgency_score} theme={theme} /> : <ToneBadge tone="gold" theme={theme}>Pending</ToneBadge>}
      </div>

      <div className="flex items-center justify-start gap-2 md:justify-end">
        <IntentBadge level={signal.intent_level} theme={theme} />
        {!signal.processed && (
          <button
            onClick={(e) => { e.stopPropagation(); onClassify(); }}
            className="min-h-8 rounded-md px-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors"
            style={{ fontFamily: theme.fontMono, background: 'var(--t-accent-soft)', color: theme.accent, border: '1px solid var(--t-accent-soft)' }}
          >
            Classify
          </button>
        )}
      </div>
    </div>
  );
}

function DetailDrawer({
  signal, theme, onClose, onClassify,
}: {
  signal: Signal;
  theme: ReturnType<typeof useWorkspaceTheme>;
  onClose: () => void;
  onClassify: () => void;
}) {
  const displayName = signal.enriched_name || signal.name;
  const displayEmail = signal.enriched_email || signal.email;
  const displayPhone = signal.enriched_phone || signal.phone;
  const company = signal.enriched_company;
  const title = signal.enriched_title;
  const linkedin = signal.enriched_linkedin_url;
  const enrichedVia = signal.enriched_via;
  const CRMId = signal.ghl_contact_id;
  const isEnriched = enrichedVia && enrichedVia !== 'none' && enrichedVia !== null;
  const sourceColor = theme.platform[signal.source] || theme.chart[3];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 overflow-y-auto"
        style={{
          background: 'var(--a-surface)',
          borderLeft: '1px solid var(--a-border)',
        }}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
            >
              Signal · detail
            </p>
            <button
              onClick={onClose}
              className="transition-colors"
              aria-label="Close"
              style={{ color: 'var(--t-fg-40)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-[0.22em] font-semibold capitalize"
                style={{
                  background: 'var(--a-hover2)',
                  border: '1px solid var(--a-border2)',
                  borderRadius: 'var(--t-radius-sm)',
                  fontFamily: theme.fontMono,
                  color: 'var(--t-fg-70)',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: sourceColor, boxShadow: `0 0 8px ${sourceColor}80` }} />
                {signal.source}
              </span>
              <IntentBadge level={signal.intent_level} theme={theme} />
              {signal.processed
                ? <ToneBadge tone="green" theme={theme}>Classified</ToneBadge>
                : <ToneBadge tone="gold" theme={theme}>Pending</ToneBadge>}
            </div>
            <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--t-fg-95)' }}>
              {displayName || `@${signal.username}` || 'LinkedIn user'}
            </h3>
            <p
              className="mt-1.5 text-[11px] tabular-nums tracking-[0.15em]"
              style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
            >
              {(signal.timestamp ? new Date(signal.timestamp) : new Date(signal.created_at))
                .toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>

          {/* Lead profile */}
          {(displayEmail || displayPhone || company || title || linkedin) && (
            <div
              className="p-4 space-y-3"
              style={{
                background: 'var(--t-accent-faint)',
                border: '1px solid var(--t-accent-soft)',
                borderRadius: 'var(--t-radius)',
              }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="text-[10px] uppercase tracking-[0.22em] font-semibold"
                  style={{ color: theme.accent, fontFamily: theme.fontMono }}
                >
                  Lead profile
                </p>
                {isEnriched && (
                  <ToneBadge tone="green" theme={theme} title={`Enriched via ${enrichedVia}`}>
                    ✓ Enriched · {enrichedVia}
                  </ToneBadge>
                )}
              </div>
              <dl className="space-y-2.5 text-[13px]">
                {displayEmail && (
                  <Row label="Email" theme={theme}>
                    <a href={`mailto:${displayEmail}`} className="hover:underline break-all" style={{ color: theme.accent }}>
                      {displayEmail}
                    </a>
                  </Row>
                )}
                {displayPhone && (
                  <Row label="Phone" theme={theme}>
                    <a
                      href={`tel:${displayPhone}`}
                      className="hover:underline tabular-nums"
                      style={{ color: theme.accent, fontFamily: theme.fontMono }}
                    >
                      {displayPhone}
                    </a>
                  </Row>
                )}
                {(company || title) && (
                  <Row label="Role" theme={theme}>
                    <span style={{ color: 'var(--t-fg-85)' }}>
                      {[title, company].filter(Boolean).join(' · ')}
                    </span>
                  </Row>
                )}
                {linkedin && (
                  <Row label="LinkedIn" theme={theme}>
                    <a
                      href={linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline break-all"
                      style={{ color: theme.accent }}
                    >
                      {linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\//, 'in/')}
                    </a>
                  </Row>
                )}
                {CRMId && (
                  <Row label="CRM ID" theme={theme}>
                    <span style={{ color: 'var(--t-fg-85)', fontFamily: theme.fontMono }}>{CRMId}</span>
                  </Row>
                )}
              </dl>
            </div>
          )}

          {/* Content */}
          <div
            className="p-4"
            style={{
              background: 'var(--a-hover2)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius)',
            }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--t-fg-85)' }}>{signal.content}</p>
          </div>

          {/* Classification */}
          {signal.processed ? (
            <div className="space-y-4">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
              >
                AI classification
              </p>

              <div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] mb-1.5" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
                  <span>Urgency</span>
                  <span style={{ fontFamily: theme.fontMono }}>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--t-fg-70)' }}>{signal.urgency_score}</span>
                    <span style={{ color: 'var(--t-fg-30)' }}>/100</span>
                  </span>
                </div>
                <UrgencyMeter score={signal.urgency_score} theme={theme} />
              </div>

              {signal.intent_category && (
                <Row label="Category" theme={theme}>
                  <span className="font-medium" style={{ color: 'var(--t-fg-95)' }}>{signal.intent_category}</span>
                </Row>
              )}

              {signal.summary && (
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.22em] mb-1.5"
                    style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
                  >
                    Summary
                  </p>
                  <p
                    className="text-sm italic px-3 py-2 leading-relaxed"
                    style={{
                      color: theme.accent,
                      background: 'var(--t-accent-faint)',
                      borderLeft: `2px solid ${theme.accent}`,
                    }}
                  >
                    {signal.summary}
                  </p>
                </div>
              )}

              {signal.pain_points?.length > 0 && (
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.22em] mb-2"
                    style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
                  >
                    Pain points
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {signal.pain_points.map((p, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-1"
                        style={{
                          background: 'var(--a-hover2)',
                          border: '1px solid var(--a-border2)',
                          color: 'var(--t-fg-85)',
                          borderRadius: '999px',
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {signal.classified_at && (
                <p
                  className="text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: 'var(--t-fg-30)', fontFamily: theme.fontMono }}
                >
                  Classified · {new Date(signal.classified_at).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm" style={{ color: 'var(--t-fg-55)' }}>Not yet classified.</p>
              <button
                onClick={onClassify}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-tight"
                style={{
                  background: theme.accent,
                  color: theme.accentOn,
                  borderRadius: 'var(--t-radius-sm)',
                  boxShadow: `0 12px 32px -12px ${theme.glow}`,
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Score this signal
              </button>
            </div>
          )}

          {signal.url && (
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:underline"
              style={{ color: theme.accent }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
              </svg>
              View original post
            </a>
          )}
        </div>
      </div>
    </>
  );
}

function Row({
  label, children, theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <div className="grid grid-cols-[68px,1fr] gap-3 items-baseline">
      <dt
        className="text-[10px] uppercase tracking-[0.22em]"
        style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
      >
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
