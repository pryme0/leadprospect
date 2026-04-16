'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

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
  // ── Enrichment (Apollo / Hunter) ──────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────

function IntentBadge({ level }: { level: string }) {
  if (!level) return <span className="badge-blue">Unclassified</span>;
  const cls =
    level === 'HIGH_INTENT' ? 'badge-red' :
    level === 'MEDIUM_INTENT' ? 'badge-yellow' : 'badge-blue';
  return <span className={cls}>{level.replace('_INTENT', '')}</span>;
}

function UrgencyBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-brand-danger' :
    score >= 40 ? 'bg-yellow-400' : 'bg-[#0BAAEF]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-brand-slate rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold w-6 text-right ${
        score >= 70 ? 'text-brand-danger' : score >= 40 ? 'text-yellow-400' : 'text-[#0BAAEF]'
      }`}>{score}</span>
    </div>
  );
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const PLATFORM_CONFIG = {
  twitter: {
    label: 'Twitter / X',
    desc: '6 search queries via Apify + Bearer Token fallback',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10 border-sky-400/20',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  reddit: {
    label: 'Reddit',
    desc: '5 subreddits via RapidAPI + public JSON fallback',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/20',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    desc: 'Video comments via Apify + YouTube Data API fallback',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    desc: 'Posts, comments & profiles via Apify scrapers',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    desc: 'Hashtag posts via Apify — replies sent via Ayrshare',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10 border-pink-400/20',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
} as const;

type Platform = keyof typeof PLATFORM_CONFIG;

// ── Main Component ─────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [ingestStatus, setIngestStatus] = useState<Record<Platform, IngestStatus>>({
    twitter: { running: false, lastCount: null, lastRun: null, error: null },
    reddit: { running: false, lastCount: null, lastRun: null, error: null },
    youtube: { running: false, lastCount: null, lastRun: null, error: null },
    linkedin: { running: false, lastCount: null, lastRun: null, error: null },
    instagram: { running: false, lastCount: null, lastRun: null, error: null },
  });

  const [classifyStatus, setClassifyStatus] = useState<ClassifyStatus>({
    running: false, lastCount: null, lastRun: null, error: null,
  });

  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [signalFilter, setSignalFilter] = useState<'all' | 'unprocessed' | 'high'>('all');
  const [sourceFilter, setSourceFilter] = useState<
    'all' | 'twitter' | 'reddit' | 'youtube' | 'linkedin' | 'instagram'
  >('all');
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const [unprocessedCount, setUnprocessedCount] = useState<number | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const FEED_PAGE_SIZE = 20;

  // ── Fetch signals ────────────────────────────────────────────────────────

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

      // Count unprocessed
      const unprocessedRes = await adminApi.getSignals({ processed: 'false', limit: 1 });
      setUnprocessedCount(
        unprocessedRes.data.total || unprocessedRes.data.count || 0,
      );
    } catch (err: any) {
      // Surface errors so invalid filters (e.g. a source the backend doesn't
      // accept) don't silently fall back to stale data. Previous bug: selecting
      // "linkedin" produced a 400 but the UI kept showing whatever loaded last.
      const msg =
        err?.response?.data?.message?.toString() ||
        err?.message ||
        'Failed to load signals';
      setSignalsError(Array.isArray(msg) ? msg.join('; ') : msg);
      setSignals([]);
      setFeedTotal(0);
    } finally {
      setSignalsLoading(false);
    }
  }, [signalFilter, sourceFilter, feedPage]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // ── Trigger ingestion ────────────────────────────────────────────────────

  const triggerIngest = async (platform: Platform) => {
    setIngestStatus((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], running: true, error: null },
    }));
    try {
      const res = await adminApi.triggerIngest(platform);
      const count = res.data?.count ?? res.data?.saved ?? 0;
      setIngestStatus((prev) => ({
        ...prev,
        [platform]: { running: false, lastCount: count, lastRun: new Date(), error: null },
      }));
      // Refresh signals after ingestion
      fetchSignals();
    } catch (err: any) {
      setIngestStatus((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          running: false,
          error: err.response?.data?.message || 'Ingestion failed',
        },
      }));
    }
  };

  // ── Trigger batch classification ─────────────────────────────────────────

  const triggerClassify = async () => {
    setClassifyStatus({ running: true, lastCount: null, lastRun: null, error: null });
    try {
      const res = await adminApi.classifyBatch();
      const count = res.data?.classified ?? 0;
      setClassifyStatus({ running: false, lastCount: count, lastRun: new Date(), error: null });
      fetchSignals();
    } catch (err: any) {
      setClassifyStatus({
        running: false,
        lastCount: null,
        lastRun: null,
        error: err.response?.data?.message || 'Classification failed',
      });
    }
  };

  // ── Trigger classify single signal ────────────────────────────────────────

  const classifySingle = async (signal: Signal) => {
    try {
      const res = await adminApi.classifySignal(signal.id);
      const updated: Signal = res.data?.data || signal;
      setSignals((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSignal?.id === updated.id) setSelectedSignal(updated);
    } catch {
      // silent
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Signal Pipeline</h1>
        <p className="text-brand-muted text-sm">
          Monitor ingestion, classification, and intent signals in real time
        </p>
      </div>

      {/* ── MODULE 1 — SIGNAL COLLECTION ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Module 1 — Signal Collection
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((platform) => {
            const cfg = PLATFORM_CONFIG[platform];
            const st = ingestStatus[platform];
            return (
              <div key={platform} className={`card border ${cfg.bg} flex flex-col gap-4`}>
                {/* Platform header */}
                <div className="flex items-center gap-3">
                  <div className={cfg.color}>{cfg.icon}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{cfg.label}</p>
                    <p className="text-brand-muted text-xs">{cfg.desc}</p>
                  </div>
                </div>

                {/* Last run info */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    {st.lastRun ? (
                      <span className="text-brand-muted">
                        Last run: <span className="text-brand-light">{timeAgo(st.lastRun)}</span>
                        {st.lastCount !== null && (
                          <span className="ml-2 text-[#0BAAEF] font-medium">+{st.lastCount} signals</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-brand-muted/60">Not triggered yet this session</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0BAAEF] animate-pulse" />
                    <span className="text-brand-muted">Auto every 10 min</span>
                  </div>
                </div>

                {/* Error */}
                {st.error && (
                  <p className="text-brand-danger text-xs bg-brand-danger/10 rounded px-2 py-1">
                    {st.error}
                  </p>
                )}

                {/* Trigger button */}
                <button
                  onClick={() => triggerIngest(platform)}
                  disabled={st.running}
                  className="btn-secondary text-sm py-2 flex items-center justify-center gap-2 mt-auto"
                >
                  {st.running ? (
                    <>
                      <span className="loading-spinner w-3.5 h-3.5" />
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run {cfg.label} Now
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── MODULE 2 — AI CLASSIFICATION ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Module 2 — AI Classification
        </h2>

        <div className="card border border-[#0BAAEF]/20 bg-[#0BAAEF]/5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Status info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0BAAEF]/20 flex items-center justify-center text-[#0BAAEF]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Claude AI Batch Classification</p>
                  <p className="text-brand-muted text-xs">
                    Processes up to 50 unprocessed signals per run · Auto-runs every 5 min
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  <span className="text-brand-muted">Pending classification:</span>
                  <span className="text-yellow-400 font-semibold">
                    {unprocessedCount !== null ? unprocessedCount : '—'}
                  </span>
                </div>

                {classifyStatus.lastRun && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0BAAEF]" />
                    <span className="text-brand-muted">Last run:</span>
                    <span className="text-brand-light">{timeAgo(classifyStatus.lastRun)}</span>
                    {classifyStatus.lastCount !== null && (
                      <span className="text-[#0BAAEF] font-medium">· {classifyStatus.lastCount} classified</span>
                    )}
                  </div>
                )}
              </div>

              {classifyStatus.error && (
                <p className="text-brand-danger text-xs bg-brand-danger/10 rounded px-2 py-1">
                  {classifyStatus.error}
                </p>
              )}
            </div>

            {/* Classify button */}
            <button
              onClick={triggerClassify}
              disabled={classifyStatus.running || unprocessedCount === 0}
              className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {classifyStatus.running ? (
                <>
                  <span className="loading-spinner w-3.5 h-3.5" />
                  Classifying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Batch Now
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── SIGNAL FEED ── */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
            Signal Feed
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Source filter (platform) */}
            <div className="flex gap-2">
              {(
                [
                  { v: 'all', label: 'All' },
                  { v: 'twitter', label: 'Twitter' },
                  { v: 'reddit', label: 'Reddit' },
                  { v: 'youtube', label: 'YouTube' },
                  { v: 'linkedin', label: 'LinkedIn' },
                  { v: 'instagram', label: 'Instagram' },
                ] as const
              ).map((s) => (
                <button
                  key={s.v}
                  onClick={() => { setSourceFilter(s.v as any); setFeedPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    sourceFilter === s.v
                      ? 'bg-[#0BAAEF] text-brand-navy'
                      : 'bg-brand-slate/50 text-brand-muted hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-brand-slate/60 mx-1" />
            {/* Intent / processed filter */}
            <div className="flex gap-2">
              {(['all', 'unprocessed', 'high'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setSignalFilter(f); setFeedPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    signalFilter === f
                      ? 'bg-[#0BAAEF] text-brand-navy'
                      : 'bg-brand-slate/50 text-brand-muted hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unprocessed' ? 'Pending' : 'HIGH INTENT'}
                </button>
              ))}
            </div>
            <button
              onClick={fetchSignals}
              className="px-3 py-1 rounded-full text-xs font-medium bg-brand-slate/50 text-brand-muted hover:text-white transition-colors"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>

        {signalsError && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 mb-3 text-sm text-red-300">
            <span className="font-medium">Request failed:</span> {signalsError}
          </div>
        )}

        {signalsLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="loading-spinner w-8 h-8 border-[#0BAAEF]" />
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <p className="mb-2">No signals found.</p>
            <p className="text-sm">Trigger ingestion above to start collecting signals.</p>
          </div>
        ) : (
          <div className="grid xl:grid-cols-2 gap-3">
            {signals.map((s) => (

              <div
                key={s.id}
                onClick={() => setSelectedSignal(s)}
                className={`card cursor-pointer hover:border-[#0BAAEF]/40 transition-all ${
                  selectedSignal?.id === s.id ? 'border-[#0BAAEF]/60 bg-[#0BAAEF]/5' : ''
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                      s.source === 'twitter' ? 'bg-sky-400/15 text-sky-400' :
                      s.source === 'reddit' ? 'bg-orange-400/15 text-orange-400' :
                      s.source === 'youtube' ? 'bg-red-400/15 text-red-400' :
                      s.source === 'linkedin' ? 'bg-blue-400/15 text-blue-400' :
                      s.source === 'instagram' ? 'bg-pink-400/15 text-pink-400' :
                      'bg-brand-slate text-brand-muted'
                    }`}>
                      {s.source}
                    </span>
                    <span className="text-brand-muted text-xs truncate">{s.name || (!/^ACoAA/i.test(s.username || '') ? `@${s.username}` : 'LinkedIn User')}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <IntentBadge level={s.intent_level} />
                    {!s.processed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); classifySingle(s); }}
                        className="text-xs px-2 py-0.5 bg-[#0BAAEF]/10 text-[#0BAAEF] border border-[#0BAAEF]/20 rounded hover:bg-[#0BAAEF]/20 transition-colors"
                      >
                        Classify
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <p className="text-brand-light text-sm leading-relaxed line-clamp-2 mb-3">
                  {s.content}
                </p>

                {/* Summary (if classified) */}
                {s.summary && (
                  <p className="text-[#0BAAEF] text-xs italic mb-3">
                    "{s.summary}"
                  </p>
                )}

                {/* Urgency bar */}
                {s.processed && s.urgency_score != null && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-brand-muted mb-1">
                      <span>Urgency</span>
                      <span>{s.intent_category || ''}</span>
                    </div>
                    <UrgencyBar score={s.urgency_score} />
                  </div>
                )}

                {/* Pain points */}
                {s.pain_points?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.pain_points.slice(0, 3).map((p, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-brand-slate/50 text-brand-muted rounded-full">
                        {p}
                      </span>
                    ))}
                    {s.pain_points.length > 3 && (
                      <span className="text-xs px-2 py-0.5 bg-brand-slate/50 text-brand-muted rounded-full">
                        +{s.pain_points.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-slate/30 text-xs text-brand-muted/60">
                  <span>{new Date(s.created_at).toLocaleString()}</span>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0BAAEF] hover:underline"
                    >
                      View source ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!signalsLoading && feedTotal > FEED_PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-slate/30">
            <p className="text-brand-muted text-sm">
              Page {feedPage} of {Math.ceil(feedTotal / FEED_PAGE_SIZE)}
              <span className="ml-2 text-brand-muted/60">· {feedTotal} total signals</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                disabled={feedPage === 1}
                className="px-4 py-2 bg-brand-slate rounded-lg text-sm text-brand-light hover:bg-brand-slate/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setFeedPage((p) => Math.min(Math.ceil(feedTotal / FEED_PAGE_SIZE), p + 1))}
                disabled={feedPage === Math.ceil(feedTotal / FEED_PAGE_SIZE)}
                className="px-4 py-2 bg-brand-slate rounded-lg text-sm text-brand-light hover:bg-brand-slate/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── SIGNAL DETAIL DRAWER ── */}
      {selectedSignal && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-brand-navy border-l border-brand-slate/50 shadow-2xl z-50 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Signal Detail</h3>
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-brand-muted hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                selectedSignal.source === 'twitter' ? 'bg-sky-400/15 text-sky-400' :
                selectedSignal.source === 'reddit' ? 'bg-orange-400/15 text-orange-400' :
                selectedSignal.source === 'youtube' ? 'bg-red-400/15 text-red-400' :
                selectedSignal.source === 'linkedin' ? 'bg-blue-400/15 text-blue-400' :
                selectedSignal.source === 'instagram' ? 'bg-pink-400/15 text-pink-400' :
                'bg-brand-slate text-brand-muted'
              }`}>
                {selectedSignal.source}
              </span>
              <IntentBadge level={selectedSignal.intent_level} />
              <span className={`text-xs px-2 py-1 rounded ${selectedSignal.processed ? 'badge-green' : 'badge-yellow'}`}>
                {selectedSignal.processed ? 'Classified' : 'Pending'}
              </span>
            </div>

            {/* Author + timestamp */}
            <div className="text-sm text-brand-muted">
              <span className="font-medium text-brand-light">
                {selectedSignal.name || `@${selectedSignal.username}`}
              </span>
              {selectedSignal.name && selectedSignal.username && selectedSignal.username !== selectedSignal.name && !/^ACoAA/i.test(selectedSignal.username) && (
                <span className="ml-2 text-xs font-mono text-brand-muted truncate">@{selectedSignal.username}</span>
              )}
              <span className="mx-2">·</span>
              {selectedSignal.timestamp
                ? new Date(selectedSignal.timestamp).toLocaleString()
                : new Date(selectedSignal.created_at).toLocaleString()}
            </div>

            {/* Lead profile — merges scraped fields (from ingestion) with
                enriched fields (from Apollo/Hunter). Enriched values take
                precedence because they're verified against a real database;
                scraped values are best-effort regex extraction from bios. */}
            {(() => {
              const displayName =
                selectedSignal.enriched_name || selectedSignal.name;
              const displayEmail =
                selectedSignal.enriched_email || selectedSignal.email;
              const displayPhone =
                selectedSignal.enriched_phone || selectedSignal.phone;
              const company = selectedSignal.enriched_company;
              const title = selectedSignal.enriched_title;
              const linkedin = selectedSignal.enriched_linkedin_url;
              const enrichedVia = selectedSignal.enriched_via;
              const ghlId = selectedSignal.ghl_contact_id;
              const isEnriched =
                enrichedVia && enrichedVia !== 'none' && enrichedVia !== null;

              if (
                !displayName && !displayEmail && !displayPhone &&
                !company && !title && !linkedin
              ) return null;

              return (
                <div className="rounded-lg border border-[#0BAAEF]/20 bg-[#0BAAEF]/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-[#0BAAEF] font-semibold">
                      Lead Profile
                    </p>
                    {isEnriched && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold uppercase"
                        title={`Enriched via ${enrichedVia}`}
                      >
                        ✓ Enriched ({enrichedVia})
                      </span>
                    )}
                  </div>

                  {displayName && (
                    <div className="flex items-start gap-2 text-xs">
                      <svg className="w-3.5 h-3.5 text-brand-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-brand-muted">Name</p>
                        <p className="text-brand-light font-medium">{displayName}</p>
                      </div>
                    </div>
                  )}

                  {displayEmail && (
                    <div className="flex items-start gap-2 text-xs">
                      <svg className="w-3.5 h-3.5 text-brand-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-brand-muted">Email</p>
                        <a
                          href={`mailto:${displayEmail}`}
                          className="text-[#0BAAEF] font-medium hover:underline break-all"
                        >
                          {displayEmail}
                        </a>
                      </div>
                    </div>
                  )}

                  {displayPhone && (
                    <div className="flex items-start gap-2 text-xs">
                      <svg className="w-3.5 h-3.5 text-brand-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-brand-muted">Phone</p>
                        <a
                          href={`tel:${displayPhone}`}
                          className="text-[#0BAAEF] font-medium hover:underline"
                        >
                          {displayPhone}
                        </a>
                      </div>
                    </div>
                  )}

                  {(company || title) && (
                    <div className="flex items-start gap-2 text-xs">
                      <svg className="w-3.5 h-3.5 text-brand-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-brand-muted">Company / Title</p>
                        <p className="text-brand-light font-medium">
                          {[title, company].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {linkedin && (
                    <div className="flex items-start gap-2 text-xs">
                      <svg className="w-3.5 h-3.5 text-brand-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-brand-muted">LinkedIn</p>
                        <a
                          href={linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0BAAEF] font-medium hover:underline break-all"
                        >
                          {linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\//, 'in/')}
                        </a>
                      </div>
                    </div>
                  )}

                  {ghlId && (
                    <div className="flex items-start gap-2 text-xs pt-1 border-t border-brand-slate/30">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-semibold uppercase">
                        GHL
                      </span>
                      <span className="text-brand-muted text-[10px]">
                        Synced to GoHighLevel:&nbsp;
                        <span className="font-mono text-brand-light">{ghlId}</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Content */}
            <div className="card bg-brand-dark">
              <p className="text-brand-light text-sm leading-relaxed whitespace-pre-wrap">
                {selectedSignal.content}
              </p>
            </div>

            {/* Classification results */}
            {selectedSignal.processed ? (
              <div className="space-y-4">
                <h4 className="text-white font-semibold text-sm">AI Classification</h4>

                {/* Urgency */}
                <div>
                  <div className="flex items-center justify-between text-xs text-brand-muted mb-2">
                    <span>Urgency Score</span>
                    <span className="font-mono font-bold text-white">{selectedSignal.urgency_score}/100</span>
                  </div>
                  <UrgencyBar score={selectedSignal.urgency_score} />
                </div>

                {/* Intent category */}
                {selectedSignal.intent_category && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-muted">Category</span>
                    <span className="text-white font-medium">{selectedSignal.intent_category}</span>
                  </div>
                )}

                {/* Summary */}
                {selectedSignal.summary && (
                  <div>
                    <p className="text-xs text-brand-muted mb-1">AI Summary</p>
                    <p className="text-[#0BAAEF] text-sm italic bg-[#0BAAEF]/5 border border-[#0BAAEF]/20 rounded-lg p-3">
                      "{selectedSignal.summary}"
                    </p>
                  </div>
                )}

                {/* Pain points */}
                {selectedSignal.pain_points?.length > 0 && (
                  <div>
                    <p className="text-xs text-brand-muted mb-2">Pain Points Detected</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSignal.pain_points.map((p, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 bg-brand-slate/50 text-brand-light border border-brand-slate/50 rounded-full"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Classified at */}
                {selectedSignal.classified_at && (
                  <p className="text-xs text-brand-muted/60">
                    Classified at {new Date(selectedSignal.classified_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-brand-muted text-sm">This signal has not been classified yet.</p>
                <button
                  onClick={() => classifySingle(selectedSignal)}
                  className="btn-primary text-sm px-6"
                >
                  Classify Now with Claude AI
                </button>
              </div>
            )}

            {/* Source link */}
            {selectedSignal.url && (
              <a
                href={selectedSignal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#0BAAEF] hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View original post
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
