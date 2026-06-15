'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, SignalStats } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

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
  const theme = useWorkspaceTheme();
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }}
        />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div
        className="mx-auto mt-12 flex max-w-xl items-start gap-3 px-4 py-3 text-sm"
        style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.20)',
          color: '#fca5a5',
          borderRadius: 'var(--t-radius-sm)',
        }}
      >
        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v5M12 16h.01" />
        </svg>
        <span>
          <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: theme.fontMono }}>
            Failed
          </span>
          {error || 'unknown error'}
        </span>
      </div>
    );
  }

  const processedPct = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const emailPct     = stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">

      {/* ── Header ── */}
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
            03 · Source explorer
          </p>
          <h1 className="text-[26px] font-black leading-tight tracking-tight" style={{ color: 'var(--t-fg-95)' }}>
            Signal explorer
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>
            Drill into signal health, intent quality, source buckets, and routing readiness without leaving the admin workflow.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <HeaderStat label="Processed" value={`${processedPct}%`} theme={theme} />
          <HeaderStat label="Reachable" value={`${emailPct}%`} theme={theme} />
          <HeaderStat label="Pending" value={stats.pending} theme={theme} tone="hot" />
        </div>
      </header>

      {/* ── Pipeline overview ── */}
      <section>
        <SectionHeader ord="01" title="Pipeline overview" subtitle="Top-level state of every signal" theme={theme} />

        <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <BigCard href={buildSignalsHref({})}                                                           label="Total"           value={stats.total}             sub="all signals"          accent={theme.chart[1]} theme={theme} featured />
          <BigCard href={buildSignalsHref({ processed: 'true' })}                                        label="Processed"       value={stats.processed}         sub={`${processedPct}% classified`} accent={theme.accent} theme={theme} />
          <BigCard href={buildSignalsHref({ processed: 'false' })}                                       label="Pending"         value={stats.pending}           sub="awaiting scoring"     accent={theme.intent.medium} theme={theme} />
          <BigCard href={buildSignalsHref({ has_email: 'true' })}                                        label="With email"      value={stats.withEmail}         sub={`${emailPct}% reachable`} accent={theme.chart[2]} theme={theme} />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <BigCard href={buildSignalsHref({ automation_sent: 'true' })}                                  label="Routed"          value={stats.automationSent}    sub="sent to CRM route"    accent="#10b981" theme={theme} />
          <BigCard href={buildSignalsHref({ automation_sent: 'false', intent_level: 'HIGH_INTENT' })}    label="Routing pending" value={stats.automationPending} sub="HIGH / MED intent, queued" accent={theme.chart[6] || theme.intent.high} theme={theme} />
        </div>
      </section>

      {/* ── Intent level ── */}
      <section>
        <SectionHeader ord="02" title="Filter by intent level" subtitle="Three-bucket buy-signal score" theme={theme} />
        <div className="flex flex-wrap gap-2">
          {stats.byIntentLevel.map((row) => {
            const label = prettifyIntentLevel(row.intent_level);
            const filter: Record<string, string> =
              row.intent_level == null ? { processed: 'false' } : { intent_level: row.intent_level };
            const color = row.intent_level === 'HIGH_INTENT'   ? theme.intent.high
                        : row.intent_level === 'MEDIUM_INTENT' ? theme.intent.medium
                        : row.intent_level === 'LOW_INTENT'    ? theme.intent.low
                        : theme.intent.none;
            return (
              <FilterChip key={row.intent_level ?? 'null'} href={buildSignalsHref(filter)} label={label} count={row.count} color={color} theme={theme} />
            );
          })}
        </div>
      </section>

      {/* ── Intent category ── */}
      <section>
        <SectionHeader ord="03" title="Filter by intent category" subtitle="Prospect typing by account fit, buying stage, and routing need" theme={theme} />
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

      {/* ── Ingestion bucket ── */}
      <section>
        <SectionHeader ord="04" title="Filter by source bucket" subtitle="Capture bucket assigned before scoring" theme={theme} />
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

// ── Atoms ──────────────────────────────────────────────────────────────────────

function SectionHeader({
  ord, title, subtitle, theme,
}: {
  ord: string;
  title: string;
  subtitle?: string;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="tabular-nums text-[10px] tracking-[0.3em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>{ord}</span>
      <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
      <div>
        <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--t-fg-95)' }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--t-fg-35)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function HeaderStat({
  label, value, theme, tone,
}: {
  label: string;
  value: number | string;
  theme: ReturnType<typeof useWorkspaceTheme>;
  tone?: 'hot';
}) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--a-hover2)', border: '1px solid var(--a-border)' }}>
      <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}>{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: tone === 'hot' ? theme.intent.medium : 'var(--t-fg-95)', fontFamily: theme.fontMono }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
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
  theme: ReturnType<typeof useWorkspaceTheme>;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block p-5 transition-colors focus:outline-none focus-visible:ring-2"
      style={{
        background: featured ? 'var(--t-accent-faint)' : 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius)',
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <p
          className="text-[10px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
        >
          {label}
        </p>
        <span className="text-sm transition-colors" style={{ color: 'var(--t-fg-25)' }}>→</span>
      </div>
      <p
        className="font-bold tabular-nums leading-none tracking-tight"
        style={{
          fontSize: featured ? '40px' : '32px',
          color: accent,
          letterSpacing: '-0.02em',
        }}
      >
        {value.toLocaleString()}
      </p>
      {sub && (
        <p
          className="mt-2 text-[11px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
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
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-11 items-center gap-2.5 px-3.5 py-2 transition-colors focus:outline-none focus-visible:ring-2"
      style={{
        background: 'var(--a-hover2)',
        border: '1px solid var(--a-border2)',
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {color && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
      <span className="text-sm font-medium capitalize transition-colors" style={{ color: 'var(--t-fg-70)' }}>
        {label}
      </span>
      <span
        className="ml-1 text-sm font-bold tabular-nums"
        style={{ color: 'var(--t-fg-95)', fontFamily: theme.fontMono }}
      >
        {count.toLocaleString()}
      </span>
    </Link>
  );
}
