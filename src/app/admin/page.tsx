'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminApi, SignalStats } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { useTenantTheme, TenantPalette } from '@/lib/tenant-theme';

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardMetrics {
  total_signals: number;
  high_intent_count: number;
  high_intent_wow: number;
  leads_captured: number;
  conversion_rate: number;
  avg_urgency: number;
  urgency_distribution: { bucket: string; count: number }[];
  ghl_sync_rate: number;
  ghl_synced: number;
  ghl_unsynced: number;
  signals_by_day: { date: string; count: number }[];
  signals_by_platform: { platform: string; count: number }[];
  leads_by_tool: { tool: string; count: number }[];
  leads_by_day: { date: string; count: number }[];
  top_pain_points: { point: string; count: number }[];
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-md border"
      style={{
        background: 'var(--a-card)',
        borderColor: 'var(--a-border2)',
        borderRadius: 'var(--t-radius)',
      }}
    >
      {label && (
        <p
          className="text-white/45 text-[10px] mb-1.5 uppercase tracking-[0.18em]"
          style={{ fontFamily: 'var(--t-mono-font)' }}
        >
          {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-white/55">{p.name}</span>
          <span className="text-white font-semibold tabular-nums ml-auto">
            {p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Atoms ─────────────────────────────────────────────────────────────────────

function MonoLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] uppercase tracking-[0.28em] text-white/40 ${className}`}
      style={{ fontFamily: 'var(--t-mono-font)' }}
    >
      {children}
    </span>
  );
}

function Surface({
  children,
  className = '',
  inset = false,
}: {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
        padding: inset ? '1.25rem' : 0,
        boxShadow: 'var(--t-card-shadow)',
      }}
    >
      {children}
    </div>
  );
}

interface KpiProps {
  ord: string;
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  accent?: string;
  href?: string;
}

function Kpi({ ord, label, value, sub, trend, accent, href }: KpiProps) {
  const inner = (
    <div
      className="group relative px-5 py-5 h-full flex flex-col gap-3 transition-all"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span
          className="text-[9px] tabular-nums tracking-[0.2em] text-white/30"
          style={{ fontFamily: 'var(--t-mono-font)' }}
        >
          {ord}
        </span>
        {trend !== undefined && (
          <span
            className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 ${
              trend >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
            style={{
              background: trend >= 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
              borderRadius: 'var(--t-radius-sm)',
              fontFamily: 'var(--t-mono-font)',
            }}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span
          className="text-2xl font-bold tracking-tight tabular-nums leading-none"
          style={{ color: accent || '#fff' }}
        >
          {value}
        </span>
        <MonoLabel>{label}</MonoLabel>
        {sub && (
          <span className="text-white/35 text-[11px] mt-0.5">{sub}</span>
        )}
      </div>
      {href && (
        <span
          className="absolute bottom-3 right-4 text-white/20 group-hover:text-white/60 transition-colors text-xs"
          aria-hidden
        >
          →
        </span>
      )}
    </div>
  );

  if (href) return <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-accent)]" style={{ borderRadius: 'var(--t-radius)' }}>{inner}</Link>;
  return inner;
}

function SectionHeader({
  ord,
  title,
  subtitle,
  right,
}: {
  ord: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="flex items-baseline gap-3 min-w-0">
        <span
          className="text-[10px] tracking-[0.3em] text-white/35 tabular-nums"
          style={{ fontFamily: 'var(--t-mono-font)' }}
        >
          {ord}
        </span>
        <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
        <div className="min-w-0">
          <h2 className="text-white font-semibold text-sm tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-white/35 text-[11px] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
      }}
      className="p-5 flex flex-col"
    >
      <div className="mb-4">
        <p className="text-white font-semibold text-[13px] tracking-tight">{title}</p>
        {subtitle && (
          <MonoLabel className="mt-1 block">{subtitle}</MonoLabel>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── Pipeline section ──────────────────────────────────────────────────────────

function prettifyIntentLevel(v: string | null): string {
  if (!v) return 'Unclassified';
  return v.replace(/_INTENT$/i, '').replace(/^./, (c) => c.toUpperCase()).toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}
function prettifySnake(v: string | null, fallback = 'Uncategorized'): string {
  if (!v) return fallback;
  return v.split('_').map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}
function intentLevelToFilter(name: string): Record<string, string> {
  if (name === 'Unclassified') return { processed: 'false' };
  return { intent_level: `${name.toUpperCase()}_INTENT` };
}
function intentCategoryToFilter(name: string): Record<string, string> {
  return { intent_category: name === 'Unclassified' ? '__null__' : name };
}
function ingestionCategoryToFilter(rawValue: string | null): Record<string, string> {
  return { ingestion_category: rawValue == null ? '__null__' : rawValue };
}
function buildSignalsHref(params: Record<string, string>): string {
  const usp = new URLSearchParams(params);
  const qs = usp.toString();
  return qs ? `/admin/signals?${qs}` : '/admin/signals';
}

function PipelineSection({ stats, theme }: { stats: SignalStats; theme: TenantPalette }) {
  const router = useRouter();
  const processedPct = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const emailPct = stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0;

  const intentLevelData = stats.byIntentLevel.map((r) => ({
    name: prettifyIntentLevel(r.intent_level),
    value: r.count,
  }));
  const intentCategoryData = stats.byIntentCategory.map((r) => ({
    name: r.intent_category || 'Unclassified',
    raw: r.intent_category,
    count: r.count,
  }));
  const ingestionCategoryData = stats.byIngestionCategory.map((r) => ({
    name: prettifySnake(r.ingestion_category),
    raw: r.ingestion_category,
    count: r.count,
  }));

  const intentLevelColor = (name: string) =>
    name === 'High' ? theme.intent.high
    : name === 'Medium' ? theme.intent.medium
    : name === 'Low' ? theme.intent.low
    : theme.intent.none;

  return (
    <section>
      <SectionHeader
        ord="03"
        title="Signal pipeline"
        subtitle="Live aggregates — every card and bar deep-links into /admin/signals"
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6" data-stagger>
        <Kpi ord="01" label="Total" value={stats.total.toLocaleString()} accent={theme.chart[1]} href={buildSignalsHref({})} />
        <Kpi ord="02" label="Processed" value={stats.processed.toLocaleString()} sub={`${processedPct}% classified`} accent={theme.accent} href={buildSignalsHref({ processed: 'true' })} />
        <Kpi ord="03" label="Pending" value={stats.pending.toLocaleString()} sub="awaiting Claude" accent={theme.intent.medium} href={buildSignalsHref({ processed: 'false' })} />
        <Kpi ord="04" label="With email" value={stats.withEmail.toLocaleString()} sub={`${emailPct}% reachable`} accent={theme.chart[2]} href={buildSignalsHref({ has_email: 'true' })} />
        <Kpi ord="05" label="Sent → automation" value={stats.automationSent.toLocaleString()} sub="forwarded" accent="#10b981" href={buildSignalsHref({ automation_sent: 'true' })} />
        <Kpi ord="06" label="Automation pending" value={stats.automationPending.toLocaleString()} sub="HIGH/MED, queued" accent={theme.chart[6] || theme.accent} href={buildSignalsHref({ automation_sent: 'false', intent_level: 'HIGH_INTENT' })} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ChartFrame title="Intent level" subtitle="Classified by Claude — click a slice to filter">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={intentLevelData}
                dataKey="value" nameKey="name"
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={88}
                paddingAngle={2}
                stroke="transparent"
                onClick={(d: any) => router.push(buildSignalsHref(intentLevelToFilter(d.name)))}
                style={{ cursor: 'pointer' }}
              >
                {intentLevelData.map((entry, idx) => (
                  <Cell key={idx} fill={intentLevelColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom" iconType="circle" iconSize={6}
                wrapperStyle={{ fontSize: 10, color: 'var(--t-fg-55)', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: theme.fontMono }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Intent category" subtitle="Prospect typing — click a bar to filter">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={intentCategoryData} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={theme.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: theme.axis, fontSize: 10 }} width={150} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--t-fg-03)' }} />
              <Bar
                dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={14}
                onClick={(d: any) => router.push(buildSignalsHref(intentCategoryToFilter(d.name)))}
                style={{ cursor: 'pointer' }}
              >
                {intentCategoryData.map((_, idx) => (
                  <Cell key={idx} fill={theme.chart[idx % theme.chart.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Ingestion category" subtitle="Pre-classifier regex bucket">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ingestionCategoryData} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={theme.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: theme.axis, fontSize: 10 }} width={150} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--t-fg-03)' }} />
              <Bar
                dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={14}
                onClick={(d: any) => router.push(buildSignalsHref(ingestionCategoryToFilter(d.raw)))}
                style={{ cursor: 'pointer' }}
              >
                {ingestionCategoryData.map((_, idx) => (
                  <Cell key={idx} fill={theme.chart[idx % theme.chart.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const theme = useTenantTheme();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [adSpend, setAdSpend] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('emc_ad_spend') || '';
    return '';
  });

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, statsRes] = await Promise.allSettled([
        adminApi.getDashboardMetrics(),
        adminApi.getSignalStats(),
      ]);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data);
      else setError('Failed to load dashboard metrics.');
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: 'var(--t-fg-06)', borderTopColor: theme.accent }}
          />
          <MonoLabel>Loading dashboard…</MonoLabel>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center mx-auto text-red-400 text-xl">!</div>
          <p className="text-white/50 text-sm">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 text-xs uppercase tracking-[0.2em]"
            style={{
              border: `1px solid ${theme.accent}`,
              color: theme.accent,
              borderRadius: 'var(--t-radius-sm)',
              fontFamily: 'var(--t-mono-font)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const convRate = (metrics.conversion_rate * 100).toFixed(1);
  const highIntentCount = (metrics as any).high_intent_signals || metrics.high_intent_count || 0;
  const highIntentPct = metrics.total_signals > 0 ? Math.round((highIntentCount / metrics.total_signals) * 100) : 0;

  const platformData = (metrics.signals_by_platform || []).map((p) => ({
    ...p,
    color: theme.platform[p.platform] || theme.chart[3],
  }));

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return d; }
  };
  const signalsByDay = (metrics.signals_by_day || []).map((d) => ({ ...d, date: formatDate(d.date) }));
  const leadsByDay = (metrics.leads_by_day || []).map((d) => ({ ...d, date: formatDate(d.date) }));

  const shortenTool = (t: string) =>
    t.replace('cyber-path-finder', 'Path Finder')
     .replace('career-assessment', 'Assessment')
     .replace('resume-analyzer', 'Resume');
  const toolData = (metrics.leads_by_tool || []).map((t) => ({ ...t, tool: shortenTool(t.tool) }));

  const todayCount = signalsByDay[signalsByDay.length - 1]?.count ?? 0;
  const yesterdayCount = signalsByDay[signalsByDay.length - 2]?.count ?? 0;
  const dayDelta = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0;

  return (
    <div className="space-y-10 max-w-[1480px] mx-auto">
      {/* ── Hero ── */}
      <header className="grid lg:grid-cols-[1fr,auto] gap-6 items-end pb-2">
        <div>
          <MonoLabel>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })}
          </MonoLabel>
          <h1 className="text-white font-bold text-3xl sm:text-4xl tracking-tight leading-[1.05] mt-2">
            Lead intelligence,
            <br className="hidden sm:block" />
            <span style={{ color: theme.accent }}>at a glance.</span>
          </h1>
          <p className="text-white/45 text-sm mt-3 max-w-md">
            Live signals from social, refined by Claude into intent, urgency, and pain points.
            Updated {lastRefresh.toLocaleTimeString()}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2"
            style={{
              background: 'var(--t-accent-faint)',
              border: '1px solid var(--t-accent-soft)',
              borderRadius: 'var(--t-radius-sm)',
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping opacity-60 rounded-full" style={{ background: theme.accent }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: theme.accent }} />
            </span>
            <span
              className="text-[9px] uppercase tracking-[0.25em] font-semibold"
              style={{ color: theme.accent, fontFamily: theme.fontMono }}
            >
              Auto · 60s
            </span>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/[0.04] transition-colors disabled:opacity-40"
            style={{
              border: '1px solid var(--a-border2)',
              color: 'var(--t-fg-70)',
              borderRadius: 'var(--t-radius-sm)',
              fontFamily: 'var(--t-mono-font)',
            }}
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* ── Hero metric: asymmetric ── */}
      <section className="grid lg:grid-cols-[1.4fr,1fr] gap-6">
        {/* Big number + sparkline */}
        <div
          className="relative p-7 overflow-hidden"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <MonoLabel>Total signals · all time</MonoLabel>
              <p className="text-white font-bold mt-2 leading-none tabular-nums" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', letterSpacing: '-0.04em' }}>
                {metrics.total_signals.toLocaleString()}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`text-xs font-semibold tabular-nums px-2 py-0.5 ${
                    dayDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                  style={{
                    background: dayDelta >= 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                    borderRadius: 'var(--t-radius-sm)',
                    fontFamily: theme.fontMono,
                  }}
                >
                  {dayDelta >= 0 ? '↑' : '↓'} {Math.abs(dayDelta)}%
                </span>
                <span className="text-white/40 text-xs">vs yesterday · {todayCount.toLocaleString()} today</span>
              </div>
            </div>
            <span
              className="text-[10px] tabular-nums tracking-[0.2em] text-white/30"
              style={{ fontFamily: theme.fontMono }}
            >
              ✱ 01
            </span>
          </div>

          <div className="h-24 mt-6 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signalsByDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradHero" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Area type="monotone" dataKey="count" stroke={theme.accent} strokeWidth={2} fill="url(#gradHero)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side KPI stack */}
        <div className="grid grid-cols-2 gap-3 content-start">
          <Kpi
            ord="02" label="High intent"
            value={highIntentCount.toLocaleString()}
            sub={`${highIntentPct}% of pool`}
            trend={metrics.high_intent_wow}
            accent={theme.intent.high}
          />
          <Kpi
            ord="03" label="Leads captured"
            value={metrics.leads_captured.toLocaleString()}
            accent={theme.accent}
          />
          <Kpi
            ord="04" label="Conversion"
            value={`${convRate}%`}
            sub="signals → leads"
            accent={theme.chart[2]}
          />
          <Kpi
            ord="05" label="Urgency"
            value={`${metrics.avg_urgency.toFixed(0)}`}
            sub={metrics.avg_urgency >= 70 ? 'High urgency pool' : metrics.avg_urgency >= 40 ? 'Medium pool' : 'Low pool'}
            accent={metrics.avg_urgency >= 70 ? theme.intent.high : metrics.avg_urgency >= 40 ? theme.intent.medium : theme.accent}
          />
        </div>
      </section>

      {/* ── Pipeline ── */}
      {stats && <PipelineSection stats={stats} theme={theme} />}

      {/* ── Trends ── */}
      <section>
        <SectionHeader ord="04" title="Trends" subtitle="Daily ingestion + capture velocity" />
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartFrame title="Signals collected" subtitle="Daily ingestion volume">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signalsByDay} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSignals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.chart[1]} stopOpacity={0.30} />
                      <stop offset="100%" stopColor={theme.chart[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme.chart[1], strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="count" name="Signals" stroke={theme.chart[1]} strokeWidth={2} fill="url(#gradSignals)" dot={false} activeDot={{ r: 5, fill: theme.chart[1], stroke: 'var(--a-card)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>

          <ChartFrame title="Leads captured" subtitle="Daily conversions">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsByDay} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.accent} stopOpacity={0.30} />
                      <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme.accent, strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="count" name="Leads" stroke={theme.accent} strokeWidth={2} fill="url(#gradLeads)" dot={false} activeDot={{ r: 5, fill: theme.accent, stroke: 'var(--a-card)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>
      </section>

      {/* ── Mix ── */}
      <section>
        <SectionHeader ord="05" title="Mix" subtitle="Where signals come from, where leads convert" />
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartFrame title="Signals by platform" subtitle="Source breakdown">
            {platformData.length === 0 ? (
              <EmptyState label="No platform data yet" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData} dataKey="count" nameKey="platform"
                      cx="40%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={3} stroke="transparent"
                    >
                      {platformData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={0.92} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      layout="vertical" align="right" verticalAlign="middle"
                      iconType="circle" iconSize={6}
                      formatter={(value) => (
                        <span style={{ color: 'var(--t-fg-70)', fontSize: 11, textTransform: 'capitalize', fontFamily: theme.fontMono, letterSpacing: '0.05em' }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartFrame>

          <ChartFrame title="Leads by tool" subtitle="Which tool converts most">
            {toolData.length === 0 ? (
              <EmptyState label="No leads yet" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={toolData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 4" stroke={theme.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="tool" tick={{ fill: 'var(--t-fg-55)', fontSize: 11 }} tickLine={false} axisLine={false} width={94} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--t-fg-03)' }} />
                    <Bar dataKey="count" name="Leads" radius={[0, 5, 5, 0]} maxBarSize={20}>
                      {toolData.map((_, i) => (
                        <Cell key={i} fill={theme.chart[i % theme.chart.length]} fillOpacity={0.92} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartFrame>
        </div>
      </section>

      {/* ── Pain points (editorial list) ── */}
      {(metrics.top_pain_points || []).length > 0 && (
        <section>
          <SectionHeader ord="06" title="Top pain points" subtitle="Most-cited barriers across all classified signals" />
          <div
            className="px-2 py-2"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <ol className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
              {metrics.top_pain_points.slice(0, 8).map((item, i) => {
                const max = metrics.top_pain_points[0]?.count || 1;
                const pct = Math.round((item.count / max) * 100);
                const color = theme.chart[i % theme.chart.length];
                return (
                  <li
                    key={i}
                    className="grid grid-cols-[40px,1fr,auto] gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: 'var(--a-border)' }}
                  >
                    <span
                      className="text-2xl font-bold tabular-nums leading-none"
                      style={{ color, fontFamily: theme.fontMono }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-white/85 text-sm leading-snug truncate">{item.point}</p>
                      <div className="mt-2 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-white/55 text-sm tabular-nums"
                      style={{ fontFamily: theme.fontMono }}
                    >
                      {item.count.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ── Health row ── */}
      <section>
        <SectionHeader ord="07" title="Health" subtitle="Sync, urgency mix, and unit economics" />
        <div className="grid lg:grid-cols-3 gap-4">
          {/* GHL sync */}
          <div
            className="p-5 flex flex-col gap-4"
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', borderRadius: 'var(--t-radius-lg)' }}
          >
            <div>
              <p className="text-white font-semibold text-[13px] tracking-tight">GHL sync</p>
              <MonoLabel className="block mt-1">GoHighLevel CRM health</MonoLabel>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-bold tabular-nums" style={{ fontSize: '2.2rem', letterSpacing: '-0.03em' }}>
                {Math.round((metrics.ghl_sync_rate || 0) * 100)}
              </span>
              <span className="text-white/40 text-lg font-semibold">%</span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round((metrics.ghl_sync_rate || 0) * 100)}%`,
                  background:
                    (metrics.ghl_sync_rate || 0) >= 0.9 ? '#10b981'
                    : (metrics.ghl_sync_rate || 0) >= 0.7 ? theme.intent.medium
                    : theme.intent.high,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <MonoLabel>Synced</MonoLabel>
                <p className="text-emerald-400 font-bold text-xl mt-1 tabular-nums">{(metrics.ghl_synced || 0).toLocaleString()}</p>
              </div>
              <div>
                <MonoLabel>Pending</MonoLabel>
                <p className="text-yellow-400 font-bold text-xl mt-1 tabular-nums">{(metrics.ghl_unsynced || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Urgency dist */}
          <ChartFrame title="Urgency distribution" subtitle="Score buckets across classified signals">
            {(metrics.urgency_distribution || []).length === 0 ? (
              <EmptyState label="No classified signals yet" />
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.urgency_distribution} margin={{ top: 5, right: 5, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 4" stroke={theme.grid} vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fill: theme.axis, fontSize: 9, fontFamily: theme.fontMono }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: theme.axis, fontSize: 10, fontFamily: theme.fontMono }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--t-fg-03)' }} />
                    <Bar dataKey="count" name="Signals" radius={[3, 3, 0, 0]} maxBarSize={36}>
                      {(metrics.urgency_distribution || []).map((entry, i) => (
                        <Cell key={i} fill={i === 0 ? theme.intent.high : i === 1 ? theme.intent.medium : theme.intent.low} fillOpacity={0.92} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartFrame>

          {/* Cost per lead */}
          <div
            className="p-5 flex flex-col gap-4"
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', borderRadius: 'var(--t-radius-lg)' }}
          >
            <div>
              <p className="text-white font-semibold text-[13px] tracking-tight">Cost per lead</p>
              <MonoLabel className="block mt-1">Manual ad spend · stored locally</MonoLabel>
            </div>
            <input
              type="number" min="0" placeholder="Ad spend this month ($)"
              value={adSpend}
              onChange={(e) => {
                setAdSpend(e.target.value);
                localStorage.setItem('emc_ad_spend', e.target.value);
              }}
              className="w-full bg-transparent border px-4 py-2.5 text-white text-sm focus:outline-none placeholder:text-white/25 transition-colors"
              style={{
                borderColor: 'var(--a-border2)',
                borderRadius: 'var(--t-radius-sm)',
              }}
            />
            <div className="flex-1 flex flex-col justify-end">
              {adSpend && parseFloat(adSpend) > 0 && metrics.leads_captured > 0 ? (
                <>
                  <p className="text-white font-bold tabular-nums" style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>
                    ${(parseFloat(adSpend) / metrics.leads_captured).toFixed(2)}
                  </p>
                  <MonoLabel className="block mt-1">
                    ${parseFloat(adSpend).toLocaleString()} ÷ {metrics.leads_captured.toLocaleString()} leads
                  </MonoLabel>
                </>
              ) : (
                <p className="text-white/30 text-sm">Enter ad spend above</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick stats ── */}
      <section>
        <SectionHeader ord="08" title="At a glance" subtitle="Today's snapshot" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Signals today', value: todayCount.toLocaleString(), color: theme.chart[1] },
            { label: 'High intent rate', value: `${highIntentPct}%`, color: theme.intent.high },
            { label: 'Top platform', value: platformData.sort((a, b) => b.count - a.count)[0]?.platform ?? '—', color: theme.intent.medium },
            { label: 'Top tool', value: toolData.sort((a, b) => b.count - a.count)[0]?.tool ?? '—', color: theme.accent },
          ].map((item, i) => (
            <div
              key={i}
              className="px-4 py-3"
              style={{
                background: 'var(--a-card)',
                border: '1px solid var(--a-border)',
                borderRadius: 'var(--t-radius)',
              }}
            >
              <MonoLabel>{item.label}</MonoLabel>
              <p
                className="font-bold text-lg capitalize tabular-nums tracking-tight mt-1"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center gap-2">
      <div className="h-px w-12 bg-white/10" />
      <span
        className="text-white/30 text-[10px] uppercase tracking-[0.28em]"
        style={{ fontFamily: 'var(--t-mono-font)' }}
      >
        {label}
      </span>
    </div>
  );
}
