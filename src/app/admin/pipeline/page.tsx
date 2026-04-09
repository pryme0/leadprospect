'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface Signal {
  id: string;
  source: string;
  username: string;
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
} as const;

type Platform = keyof typeof PLATFORM_CONFIG;

// ── Main Component ─────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [ingestStatus, setIngestStatus] = useState<Record<Platform, IngestStatus>>({
    twitter: { running: false, lastCount: null, lastRun: null, error: null },
    reddit: { running: false, lastCount: null, lastRun: null, error: null },
    youtube: { running: false, lastCount: null, lastRun: null, error: null },
    linkedin: { running: false, lastCount: null, lastRun: null, error: null },
  });

  const [classifyStatus, setClassifyStatus] = useState<ClassifyStatus>({
    running: false, lastCount: null, lastRun: null, error: null,
  });

  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [signalFilter, setSignalFilter] = useState<'all' | 'unprocessed' | 'high'>('all');
  const [unprocessedCount, setUnprocessedCount] = useState<number | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const FEED_PAGE_SIZE = 20;

  // ── Fetch signals ────────────────────────────────────────────────────────

  const fetchSignals = useCallback(async () => {
    setSignalsLoading(true);
    try {
      const params: any = { limit: FEED_PAGE_SIZE, offset: (feedPage - 1) * FEED_PAGE_SIZE };
      if (signalFilter === 'unprocessed') params.processed = 'false';
      if (signalFilter === 'high') params.intent_level = 'HIGH_INTENT';
      const res = await adminApi.getSignals(params);
      const list: Signal[] = res.data.signals || res.data.data || [];
      setSignals(list);
      setFeedTotal(res.data.total || list.length);

      // Count unprocessed
      const unprocessedRes = await adminApi.getSignals({ processed: 'false', limit: 1 });
      setUnprocessedCount(
        unprocessedRes.data.total || unprocessedRes.data.count || 0,
      );
    } catch {
      // silent
    } finally {
      setSignalsLoading(false);
    }
  }, [signalFilter, feedPage]);

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
            Signal Feed
          </h2>
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
            <button
              onClick={fetchSignals}
              className="px-3 py-1 rounded-full text-xs font-medium bg-brand-slate/50 text-brand-muted hover:text-white transition-colors"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>

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
                      'bg-brand-slate text-brand-muted'
                    }`}>
                      {s.source}
                    </span>
                    <span className="text-brand-muted text-xs truncate">@{s.username}</span>
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
              <span className="font-medium text-brand-light">@{selectedSignal.username}</span>
              <span className="mx-2">·</span>
              {selectedSignal.timestamp
                ? new Date(selectedSignal.timestamp).toLocaleString()
                : new Date(selectedSignal.created_at).toLocaleString()}
            </div>

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
