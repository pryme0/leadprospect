'use client';

// Stats-driven filter explorer. Every count surfaced here links into
// /admin/signals with the matching query params, so the user can pick a
// slice (e.g. "open_to_work" + "HIGH_INTENT" + "has email") visually and
// drop straight onto the records list.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, SignalStats } from '@/lib/api';

function buildSignalsHref(params: Record<string, string>): string {
  const usp = new URLSearchParams(params);
  const qs = usp.toString();
  return qs ? `/admin/signals?${qs}` : '/admin/signals';
}

function prettifyIntentLevel(v: string | null): string {
  if (!v) return 'Unclassified';
  return v.replace(/_INTENT$/i, '').toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

function prettifySnake(v: string | null, fallback = 'Uncategorized'): string {
  if (!v) return fallback;
  return v
    .split('_')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const INTENT_LEVEL_COLORS: Record<string, string> = {
  HIGH_INTENT: '#f43f5e',
  MEDIUM_INTENT: '#f97316',
  LOW_INTENT: '#0BAAEF',
};

interface BigCardProps {
  href: string;
  label: string;
  value: number;
  sub?: string;
  accent: string;
}

function BigCard({ href, label, value, sub, accent }: BigCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border p-6 transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0BAAEF]"
      style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</p>
        <span className="text-white/30 group-hover:text-[#0BAAEF] text-xs">→</span>
      </div>
      <p className="text-white font-bold text-3xl tracking-tight">{value.toLocaleString()}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
      <div
        className="mt-4 h-1 rounded-full"
        style={{ background: `${accent}40` }}
      />
    </Link>
  );
}

function FilterChip({
  href,
  label,
  count,
  color,
}: {
  href: string;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-full border px-3.5 py-2 transition-all hover:border-[#0BAAEF]/40 hover:-translate-y-0.5"
      style={{
        background: 'var(--a-card)',
        borderColor: 'var(--a-border)',
      }}
    >
      {color && (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      )}
      <span className="text-white/70 group-hover:text-white text-xs">{label}</span>
      <span className="text-white font-semibold text-xs tabular-nums">
        {count.toLocaleString()}
      </span>
    </Link>
  );
}

export default function ExplorePage() {
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getSignalStats()
      .then((res) => {
        if (cancelled) return;
        setStats(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.response?.data?.message?.toString() ||
          err?.message ||
          'Failed to load signal stats';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-white/10 border-t-[#0BAAEF] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <span className="font-medium">Failed to load stats:</span> {error || 'unknown error'}
      </div>
    );
  }

  const processedPct = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const emailPct = stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-white font-bold text-xl">Explore Signals</h1>
        <p className="text-white/40 text-sm mt-1">
          Pick any slice of the pipeline below — every count links into the
          records list with that filter pre-applied.
        </p>
      </div>

      {/* Big top-level cards */}
      <section className="space-y-3">
        <h2 className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
          Pipeline overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <BigCard
            href={buildSignalsHref({})}
            label="Total Signals"
            value={stats.total}
            accent="#40C4FF"
          />
          <BigCard
            href={buildSignalsHref({ processed: 'true' })}
            label="Processed"
            value={stats.processed}
            sub={`${processedPct}% classified`}
            accent="#0BAAEF"
          />
          <BigCard
            href={buildSignalsHref({ processed: 'false' })}
            label="Pending"
            value={stats.pending}
            sub="awaiting Claude"
            accent="#f97316"
          />
          <BigCard
            href={buildSignalsHref({ has_email: 'true' })}
            label="With Email"
            value={stats.withEmail}
            sub={`${emailPct}% reachable`}
            accent="#6366f1"
          />
        </div>
      </section>

      {/* Intent Level — small, fixed set */}
      <section className="space-y-3">
        <div>
          <h2 className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
            Filter by Intent Level
          </h2>
          <p className="text-white/30 text-xs mt-0.5">
            Claude's three-bucket buy-signal score.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.byIntentLevel.map((row) => {
            const label = prettifyIntentLevel(row.intent_level);
            const filter: Record<string, string> =
              row.intent_level == null
                ? { processed: 'false' }
                : { intent_level: row.intent_level };
            return (
              <FilterChip
                key={row.intent_level ?? 'null'}
                href={buildSignalsHref(filter)}
                label={label}
                count={row.count}
                color={
                  row.intent_level
                    ? INTENT_LEVEL_COLORS[row.intent_level]
                    : 'rgba(255,255,255,0.2)'
                }
              />
            );
          })}
        </div>
      </section>

      {/* Intent Category — Claude's prospect typing */}
      <section className="space-y-3">
        <div>
          <h2 className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
            Filter by Intent Category
          </h2>
          <p className="text-white/30 text-xs mt-0.5">
            Claude's prospect-type label (Curious, Career Switcher, …).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.byIntentCategory.map((row, idx) => (
            <FilterChip
              key={row.intent_category ?? `null-${idx}`}
              href={buildSignalsHref({
                intent_category: row.intent_category ?? '__null__',
              })}
              label={row.intent_category || 'Unclassified'}
              count={row.count}
            />
          ))}
        </div>
      </section>

      {/* Ingestion Category — pre-classifier regex bucket */}
      <section className="space-y-3">
        <div>
          <h2 className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
            Filter by Ingestion Category
          </h2>
          <p className="text-white/30 text-xs mt-0.5">
            Pre-classifier deterministic bucket — assigned at ingestion time
            via regex, before Claude ever sees the signal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.byIngestionCategory.map((row, idx) => (
            <FilterChip
              key={row.ingestion_category ?? `null-${idx}`}
              href={buildSignalsHref({
                ingestion_category: row.ingestion_category ?? '__null__',
              })}
              label={prettifySnake(row.ingestion_category)}
              count={row.count}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
