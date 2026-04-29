'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, SignalStats } from '@/lib/api';
import { useTenantTheme } from '@/lib/tenant-theme';

function buildSignalsHref(params: Record<string, string>): string {
  const usp = new URLSearchParams(params);
  const qs = usp.toString();
  return qs ? `/admin/signals?${qs}` : '/admin/signals';
}

function prettifyIntentLevel(v: string | null): string {
  if (!v) return 'Unclassified';
  return v.replace(/_INTENT$/i, '').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function prettifySnake(v: string | null, fallback = 'Uncategorized'): string {
  if (!v) return fallback;
  return v.split('_').map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

export default function ExplorePage() {
  const theme = useTenantTheme();
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.getSignalStats()
      .then((res) => { if (!cancelled) setStats(res.data); })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.response?.data?.message?.toString() || err?.message || 'Failed to load signal stats';
        setError(msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--t-fg-06)', borderTopColor: theme.accent }}
        />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        className="px-4 py-3 text-sm flex items-start gap-3 max-w-xl mx-auto mt-12"
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
        <span>
          <span className="font-semibold uppercase tracking-[0.18em] text-[11px] mr-2" style={{ fontFamily: theme.fontMono }}>
            Failed
          </span>
          {error || 'unknown error'}
        </span>
      </div>
    );
  }

  const processedPct = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const emailPct = stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0;

  return (
    <div className="space-y-10 max-w-[1480px] mx-auto">
      {/* Header */}
      <header>
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2 flex items-center gap-2.5"
          style={{ fontFamily: theme.fontMono }}
        >
          <span className="text-white/55">02</span>
          <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
          <span>Explore</span>
        </p>
        <h1 className="text-white font-bold text-3xl tracking-tight leading-[1.05]">
          Slice the pipeline.
        </h1>
        <p className="text-white/45 text-sm mt-2 max-w-xl">
          Pick any cell, chip, or count below — every value links straight into
          the records list with that filter pre-applied. Your visual query builder.
        </p>
      </header>

      {/* Pipeline overview — asymmetric grid */}
      <section>
        <SectionHeader ord="01" title="Pipeline overview" subtitle="Top-level state of every signal" theme={theme} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
          <BigCard
            href={buildSignalsHref({})}
            label="Total"
            value={stats.total}
            sub="all signals"
            accent={theme.chart[1]}
            theme={theme}
            featured
          />
          <BigCard
            href={buildSignalsHref({ processed: 'true' })}
            label="Processed"
            value={stats.processed}
            sub={`${processedPct}% classified`}
            accent={theme.accent}
            theme={theme}
          />
          <BigCard
            href={buildSignalsHref({ processed: 'false' })}
            label="Pending"
            value={stats.pending}
            sub="awaiting Claude"
            accent={theme.intent.medium}
            theme={theme}
          />
          <BigCard
            href={buildSignalsHref({ has_email: 'true' })}
            label="With email"
            value={stats.withEmail}
            sub={`${emailPct}% reachable`}
            accent={theme.chart[2]}
            theme={theme}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BigCard
            href={buildSignalsHref({ automation_sent: 'true' })}
            label="Sent to automation"
            value={stats.automationSent}
            sub="forwarded to webhook"
            accent="#10b981"
            theme={theme}
          />
          <BigCard
            href={buildSignalsHref({ automation_sent: 'false', intent_level: 'HIGH_INTENT' })}
            label="Automation pending"
            value={stats.automationPending}
            sub="HIGH / MED intent, queued"
            accent={theme.chart[6] || theme.intent.high}
            theme={theme}
          />
        </div>
      </section>

      {/* Intent level */}
      <section>
        <SectionHeader
          ord="02"
          title="Filter by intent level"
          subtitle="Claude's three-bucket buy-signal score"
          theme={theme}
        />
        <div className="flex flex-wrap gap-2">
          {stats.byIntentLevel.map((row) => {
            const label = prettifyIntentLevel(row.intent_level);
            const filter: Record<string, string> =
              row.intent_level == null ? { processed: 'false' } : { intent_level: row.intent_level };
            const color = row.intent_level === 'HIGH_INTENT' ? theme.intent.high
              : row.intent_level === 'MEDIUM_INTENT' ? theme.intent.medium
              : row.intent_level === 'LOW_INTENT' ? theme.intent.low
              : theme.intent.none;
            return (
              <FilterChip
                key={row.intent_level ?? 'null'}
                href={buildSignalsHref(filter)}
                label={label}
                count={row.count}
                color={color}
                theme={theme}
              />
            );
          })}
        </div>
      </section>

      {/* Intent category */}
      <section>
        <SectionHeader
          ord="03"
          title="Filter by intent category"
          subtitle="Prospect typing — Curious, Career Switcher, etc."
          theme={theme}
        />
        <div className="flex flex-wrap gap-2">
          {stats.byIntentCategory.map((row, idx) => (
            <FilterChip
              key={row.intent_category ?? `null-${idx}`}
              href={buildSignalsHref({ intent_category: row.intent_category ?? '__null__' })}
              label={row.intent_category || 'Unclassified'}
              count={row.count}
              color={theme.chart[idx % theme.chart.length]}
              theme={theme}
            />
          ))}
        </div>
      </section>

      {/* Ingestion bucket */}
      <section>
        <SectionHeader
          ord="04"
          title="Filter by ingestion bucket"
          subtitle="Pre-classifier regex bucket assigned at ingestion time"
          theme={theme}
        />
        <div className="flex flex-wrap gap-2">
          {stats.byIngestionCategory.map((row, idx) => (
            <FilterChip
              key={row.ingestion_category ?? `null-${idx}`}
              href={buildSignalsHref({ ingestion_category: row.ingestion_category ?? '__null__' })}
              label={prettifySnake(row.ingestion_category)}
              count={row.count}
              color={theme.chart[(idx + 3) % theme.chart.length]}
              theme={theme}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function SectionHeader({
  ord, title, subtitle, theme,
}: {
  ord: string;
  title: string;
  subtitle?: string;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span
        className="text-[10px] tracking-[0.3em] text-white/35 tabular-nums"
        style={{ fontFamily: theme.fontMono }}
      >
        {ord}
      </span>
      <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
      <div>
        <h2 className="text-white font-semibold text-sm tracking-tight">{title}</h2>
        {subtitle && <p className="text-white/35 text-[11px] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function BigCard({
  href, label, value, sub, accent, theme, featured = false,
}: {
  href: string;
  label: string;
  value: number;
  sub?: string;
  accent: string;
  theme: ReturnType<typeof useTenantTheme>;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden p-6 transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
      }}
    >
      {/* Top-edge accent rule */}
      <span
        className="absolute top-0 left-0 h-[2px] transition-all duration-500 group-hover:w-full"
        style={{ width: featured ? '40%' : '20%', background: accent }}
      />
      <div className="flex items-start justify-between mb-4">
        <p
          className="text-[10px] uppercase tracking-[0.22em] text-white/45"
          style={{ fontFamily: theme.fontMono }}
        >
          {label}
        </p>
        <span className="text-white/25 group-hover:text-white text-sm transition-colors">→</span>
      </div>
      <p
        className="text-white font-bold tabular-nums tracking-tight leading-none"
        style={{
          fontSize: featured ? 'clamp(2.5rem, 4vw, 3.5rem)' : 'clamp(2rem, 3vw, 2.5rem)',
          color: accent,
          letterSpacing: '-0.03em',
        }}
      >
        {value.toLocaleString()}
      </p>
      {sub && (
        <p
          className="text-white/40 text-[11px] mt-2 uppercase tracking-[0.18em]"
          style={{ fontFamily: theme.fontMono }}
        >
          {sub}
        </p>
      )}
    </Link>
  );
}

function FilterChip({
  href, label, count, color, theme,
}: {
  href: string;
  label: string;
  count: number;
  color?: string;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 px-3.5 py-2 transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 transition-all"
          style={{ background: color, boxShadow: `0 0 0 0 ${color}` }}
        />
      )}
      <span className="text-white/70 group-hover:text-white text-xs font-medium capitalize transition-colors">
        {label}
      </span>
      <span
        className="text-white font-bold text-xs tabular-nums ml-1"
        style={{ fontFamily: theme.fontMono }}
      >
        {count.toLocaleString()}
      </span>
    </Link>
  );
}
