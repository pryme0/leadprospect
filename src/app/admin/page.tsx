'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminApi, SignalStats } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useWorkspaceTheme, WorkspacePalette } from '@/lib/workspace-theme';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface DailyBucket {
  linkedin_signals: number;
  linkedin_high_intent: number;
  leads_captured: number;
  conversion_rate: number;
  avg_urgency: number;
}

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
  daily?: { today: DailyBucket; yesterday: DailyBucket };
}

function pctDelta(a: number, b: number): number {
  if (b === 0) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 100);
}

function prettifyIntentLevel(v: string | null): string {
  if (!v) return 'Unclassified';
  return v.replace(/_INTENT$/i, '').charAt(0).toUpperCase() +
    v.replace(/_INTENT$/i, '').slice(1).toLowerCase();
}

function prettifySnake(v: string | null, fallback = 'Uncategorized'): string {
  if (!v) return fallback;
  return v.split('_').map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

function buildSignalsHref(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `/admin/signals?${qs}` : '/admin/signals';
}

/* ── Custom tooltip ─────────────────────────────────────────────────────────── */

const Tooltip_ = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F1929] px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
      {label && <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-xs text-white/50">{p.name}</span>
          <span className="ml-auto text-xs font-semibold tabular-nums text-white">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

/* ── KPI Card ───────────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, sub, trend, accentColor, sparkData, href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  accentColor: string;
  sparkData?: { count: number }[];
  href?: string;
}) {
  const inner = (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0F1929] p-5 transition-all duration-200 hover:border-white/[0.10] hover:bg-[#111929]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium text-white/45">{label}</p>
        {trend !== undefined && (
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
              trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[32px] font-bold leading-none tracking-tight tabular-nums" style={{ color: accentColor }}>
          {value}
        </p>
        {sub && <p className="mt-1.5 text-[11px] text-white/30">{sub}</p>}
      </div>
      {sparkData && sparkData.length > 1 && (
        <div className="mt-4 h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="count" stroke={accentColor} strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {href && (
        <span className="absolute bottom-4 right-4 text-white/15 transition-colors group-hover:text-white/40 text-sm">→</span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full focus:outline-none">{inner}</Link>;
  }
  return inner;
}

/* ── Chart Card ─────────────────────────────────────────────────────────────── */

function ChartCard({ title, sub, children, className = '' }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-[#0F1929] p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[14px] font-semibold text-white">{title}</p>
          {sub && <p className="mt-0.5 text-[11px] text-white/35">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Loading / Error ────────────────────────────────────────────────────────── */

function Spinner({ theme }: { theme: WorkspacePalette }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/[0.06]" style={{ borderTopColor: theme.accent }} />
        <p className="text-xs uppercase tracking-[0.24em] text-white/30">Loading dashboard…</p>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const theme = useWorkspaceTheme();
  const router = useRouter();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stats,   setStats]   = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [adSpend, setAdSpend] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('prospectgrid_ad_spend') || '' : ''
  );

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

  if (loading && !metrics) return <Spinner theme={theme} />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 text-lg">!</div>
          <p className="text-sm text-white/40">{error}</p>
          <button
            onClick={fetchMetrics}
            className="rounded-full border border-[#2563EB]/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB] transition hover:bg-[#2563EB]/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  /* ── Derived data ── */

  const today = metrics.daily?.today ?? { linkedin_signals: 0, linkedin_high_intent: 0, leads_captured: 0, conversion_rate: 0, avg_urgency: 0 };
  const yest  = metrics.daily?.yesterday ?? { linkedin_signals: 0, linkedin_high_intent: 0, leads_captured: 0, conversion_rate: 0, avg_urgency: 0 };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  const signalsByDay = (metrics.signals_by_day || []).map((d) => ({ ...d, date: formatDate(d.date) }));
  const leadsByDay   = (metrics.leads_by_day || []).map((d) => ({ ...d, date: formatDate(d.date) }));

  const platformData = (metrics.signals_by_platform || []).map((p, i) => ({
    ...p,
    color: theme.platform[p.platform] || theme.chart[i % theme.chart.length],
  }));

  const shortenTool = (t: string) =>
    t.replace('google-ads', 'Google Ads')
     .replace('meta-ads', 'Meta Ads')
     .replace('crm-import', 'CRM Import')
     .replace('source-routing', 'Source Routing')
     .replace('dedupe-preview', 'Dedupe')
     .replace('account-expansion', 'Expansion');
  const toolData = (metrics.leads_by_tool || []).map((t) => ({ ...t, tool: shortenTool(t.tool) }));

  const intentLevelData = (stats?.byIntentLevel || []).map((r) => ({
    name: prettifyIntentLevel(r.intent_level),
    value: r.count,
  }));
  const intentCategoryData = (stats?.byIntentCategory || []).map((r) => ({
    name: r.intent_category || 'Unclassified',
    raw: r.intent_category,
    count: r.count,
  }));
  const ingestionCategoryData = (stats?.byIngestionCategory || []).map((r) => ({
    name: prettifySnake(r.ingestion_category),
    raw: r.ingestion_category,
    count: r.count,
  }));

  const intentColor = (name: string) =>
    name === 'High' ? theme.intent.high
    : name === 'Medium' ? theme.intent.medium
    : name === 'Low' ? theme.intent.low
    : theme.intent.none;

  const crmRate     = Math.round((metrics.ghl_sync_rate || 0) * 100);
  const spend       = Number(adSpend || 0);
  const costPerLead = spend > 0 && metrics.leads_captured > 0
    ? `$${Math.round(spend / metrics.leads_captured)}`
    : '—';

  const highIntentCount = (metrics as any).high_intent_signals || metrics.high_intent_count || 0;
  const highIntentPct   = metrics.total_signals > 0 ? Math.round((highIntentCount / metrics.total_signals) * 100) : 0;
  const todayCount      = signalsByDay[signalsByDay.length - 1]?.count ?? 0;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Welcome header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/25">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight text-white sm:text-3xl">
            Revenue operations
          </h1>
          <p className="mt-1.5 text-[13px] text-white/40">
            Updated {lastRefresh.toLocaleTimeString()} · auto-refresh every 60s
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex w-fit items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[12px] font-semibold text-white/50 transition hover:bg-white/[0.07] hover:text-white/80 disabled:opacity-40"
        >
          <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-stagger>
        <KpiCard
          label="Signals today"
          value={today.linkedin_signals.toLocaleString()}
          sub={`Yesterday: ${yest.linkedin_signals.toLocaleString()}`}
          trend={pctDelta(today.linkedin_signals, yest.linkedin_signals)}
          accentColor={theme.chart[1]}
          sparkData={signalsByDay.slice(-14)}
        />
        <KpiCard
          label="High intent today"
          value={today.linkedin_high_intent.toLocaleString()}
          sub={`Yesterday: ${yest.linkedin_high_intent.toLocaleString()}`}
          trend={pctDelta(today.linkedin_high_intent, yest.linkedin_high_intent)}
          accentColor={theme.intent.high}
          sparkData={signalsByDay.slice(-14)}
        />
        <KpiCard
          label="Leads captured"
          value={today.leads_captured.toLocaleString()}
          sub={`Yesterday: ${yest.leads_captured.toLocaleString()}`}
          trend={pctDelta(today.leads_captured, yest.leads_captured)}
          accentColor={theme.accent}
          sparkData={leadsByDay.slice(-14)}
        />
        <KpiCard
          label="Conversion rate"
          value={`${today.conversion_rate.toFixed(1)}%`}
          sub={`Yesterday: ${yest.conversion_rate.toFixed(1)}%`}
          trend={pctDelta(today.conversion_rate, yest.conversion_rate)}
          accentColor={theme.chart[2]}
        />
      </div>

      {/* ── Pipeline summary cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-stagger>
        {[
          { label: 'Total signals',   value: metrics.total_signals.toLocaleString(), color: theme.chart[1], href: buildSignalsHref({}) },
          { label: 'Processed',       value: stats?.processed.toLocaleString() ?? '—', color: theme.accent, href: buildSignalsHref({ processed: 'true' }) },
          { label: 'Pending',         value: stats?.pending.toLocaleString() ?? '—', color: theme.intent.medium, href: buildSignalsHref({ processed: 'false' }) },
          { label: 'With email',      value: stats?.withEmail.toLocaleString() ?? '—', color: theme.chart[2], href: buildSignalsHref({ has_email: 'true' }) },
          { label: 'Routed today',    value: stats?.automationSentToday?.toLocaleString() ?? '—', color: '#22C55E', href: buildSignalsHref({ automation_sent: 'true' }) },
          { label: 'Route pending',   value: stats?.automationPending.toLocaleString() ?? '—', color: theme.intent.high, href: buildSignalsHref({ automation_sent: 'false' }) },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-xl border border-white/[0.06] bg-[#0F1929] px-4 py-4 transition-all hover:border-white/[0.10] hover:bg-[#111929]"
          >
            <p className="text-[11px] font-medium text-white/35">{item.label}</p>
            <p className="mt-2 text-[22px] font-bold tabular-nums tracking-tight" style={{ color: item.color }}>
              {item.value}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Trend charts ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Signals over time" sub="Daily source volume">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signalsByDay} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSignals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.chart[1]} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={theme.chart[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tooltip_ />} cursor={{ stroke: theme.chart[1], strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area type="monotone" dataKey="count" name="Signals" stroke={theme.chart[1]} strokeWidth={2} fill="url(#gradSignals)" dot={false} activeDot={{ r: 4, fill: theme.chart[1], strokeWidth: 2, stroke: '#0F1929' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Leads captured" sub="Daily qualified leads">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsByDay} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.accent} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tooltip_ />} cursor={{ stroke: theme.accent, strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area type="monotone" dataKey="count" name="Leads" stroke={theme.accent} strokeWidth={2} fill="url(#gradLeads)" dot={false} activeDot={{ r: 4, fill: theme.accent, strokeWidth: 2, stroke: '#0F1929' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Intent + Category charts ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Intent level" sub="Scored by buying intent">
          {intentLevelData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intentLevelData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                    paddingAngle={3} stroke="transparent"
                    onClick={(d: any) => router.push(buildSignalsHref(
                      d.name === 'Unclassified' ? { processed: 'false' } : { intent_level: `${d.name.toUpperCase()}_INTENT` }
                    ))}
                    style={{ cursor: 'pointer' }}
                  >
                    {intentLevelData.map((entry, i) => (
                      <Cell key={i} fill={intentColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip content={<Tooltip_ />} />
                  <Legend
                    verticalAlign="bottom" iconType="circle" iconSize={6}
                    wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize', letterSpacing: '0.05em' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptySlot />}
        </ChartCard>

        <ChartCard title="Intent category" sub="Account fit and buying stage">
          {intentCategoryData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentCategoryData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tooltip_ />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar
                    dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={12}
                    onClick={(d: any) => router.push(buildSignalsHref({ intent_category: d.name === 'Unclassified' ? '__null__' : d.name }))}
                    style={{ cursor: 'pointer' }}
                  >
                    {intentCategoryData.map((_, i) => (
                      <Cell key={i} fill={theme.chart[i % theme.chart.length]} fillOpacity={0.88} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptySlot />}
        </ChartCard>

        <ChartCard title="Ingestion category" sub="Source bucket at capture">
          {ingestionCategoryData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ingestionCategoryData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tooltip_ />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar
                    dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={12}
                    onClick={(d: any) => router.push(buildSignalsHref({ ingestion_category: d.raw == null ? '__null__' : d.raw }))}
                    style={{ cursor: 'pointer' }}
                  >
                    {ingestionCategoryData.map((_, i) => (
                      <Cell key={i} fill={theme.chart[(i + 3) % theme.chart.length]} fillOpacity={0.88} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptySlot />}
        </ChartCard>
      </div>

      {/* ── Source mix ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Signals by platform" sub="Channel quality mix">
          {platformData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformData} dataKey="count" nameKey="platform"
                    cx="40%" cy="50%" innerRadius={52} outerRadius={80}
                    paddingAngle={3} stroke="transparent">
                    {platformData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.90} />
                    ))}
                  </Pie>
                  <Tooltip content={<Tooltip_ />} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={6}
                    formatter={(value) => (
                      <span style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, textTransform: 'capitalize', letterSpacing: '0.04em' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptySlot />}
        </ChartCard>

        <ChartCard title="Leads by source" sub="Which source drives qualified businesses">
          {toolData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="tool" tick={{ fill: 'rgba(255,255,255,0.50)', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<Tooltip_ />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="count" name="Leads" radius={[0, 5, 5, 0]} maxBarSize={16}>
                    {toolData.map((_, i) => (
                      <Cell key={i} fill={theme.chart[i % theme.chart.length]} fillOpacity={0.90} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptySlot />}
        </ChartCard>
      </div>

      {/* ── Health row ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* CRM routing */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0F1929] p-5">
          <p className="text-[14px] font-semibold text-white">CRM routing</p>
          <p className="mt-0.5 text-[11px] text-white/35">Routing and CRM delivery health</p>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-[38px] font-bold tabular-nums leading-none tracking-tight text-white">{crmRate}</span>
            <span className="text-lg font-semibold text-white/40">%</span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${crmRate}%`,
                background: crmRate >= 90 ? '#22C55E' : crmRate >= 70 ? theme.intent.medium : theme.intent.high,
              }}
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">Synced</p>
              <p className="mt-1.5 text-xl font-bold tabular-nums text-emerald-400">{(metrics.ghl_synced || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">Pending</p>
              <p className="mt-1.5 text-xl font-bold tabular-nums text-amber-400">{(metrics.ghl_unsynced || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Urgency distribution */}
        <ChartCard title="Urgency distribution" sub="Score buckets across classified signals">
          {(metrics.urgency_distribution || []).length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.urgency_distribution} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: theme.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<Tooltip_ />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="count" name="Signals" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {(metrics.urgency_distribution || []).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? theme.intent.high : i === 1 ? theme.intent.medium : theme.intent.low} fillOpacity={0.90} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptySlot />}
        </ChartCard>

        {/* Cost per lead */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0F1929] p-5 flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-semibold text-white">Cost per lead</p>
            <p className="mt-0.5 text-[11px] text-white/35">Monthly ad spend · stored locally</p>
          </div>
          <input
            type="number"
            min="0"
            placeholder="Ad spend this month ($)"
            value={adSpend}
            onChange={(e) => {
              setAdSpend(e.target.value);
              localStorage.setItem('prospectgrid_ad_spend', e.target.value);
            }}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 transition-colors focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/10"
          />
          <div className="flex-1 flex flex-col justify-end">
            {adSpend && parseFloat(adSpend) > 0 && metrics.leads_captured > 0 ? (
              <div>
                <p className="text-[34px] font-bold tabular-nums leading-none tracking-tight" style={{ color: theme.accent }}>
                  ${(parseFloat(adSpend) / metrics.leads_captured).toFixed(2)}
                </p>
                <p className="mt-2 text-[11px] text-white/30">
                  ${parseFloat(adSpend).toLocaleString()} ÷ {metrics.leads_captured.toLocaleString()} leads
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-white/25">Enter your monthly ad spend above</p>
            )}
          </div>
        </div>
      </div>

      {/* ── At a glance ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Signals today',  value: todayCount.toLocaleString(), color: theme.chart[1] },
          { label: 'High intent %',  value: `${highIntentPct}%`, color: theme.intent.high },
          { label: 'Top platform',   value: platformData.sort((a, b) => b.count - a.count)[0]?.platform ?? '—', color: theme.intent.medium },
          { label: 'Top source',     value: toolData.sort((a, b) => b.count - a.count)[0]?.tool ?? '—', color: theme.accent },
        ].map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-[#0F1929] px-5 py-4"
          >
            <p className="text-[11px] font-medium text-white/35">{item.label}</p>
            <p className="mt-2 text-[18px] font-bold capitalize tracking-tight tabular-nums" style={{ color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Pain points ── */}
      {(metrics.top_pain_points || []).length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0F1929]">
          <div className="border-b border-white/[0.05] px-5 py-4">
            <p className="text-[14px] font-semibold text-white">Top routing blockers</p>
            <p className="mt-0.5 text-[11px] text-white/35">Operational blockers across sourced leads</p>
          </div>
          <ol className="divide-y divide-white/[0.04]">
            {metrics.top_pain_points.slice(0, 8).map((item, i) => {
              const max = metrics.top_pain_points[0]?.count || 1;
              const pct = Math.round((item.count / max) * 100);
              const color = theme.chart[i % theme.chart.length];
              return (
                <li key={i} className="grid grid-cols-[44px,1fr,auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
                  <span className="text-[20px] font-bold tabular-nums leading-none" style={{ color, fontFamily: 'var(--t-mono-font)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] leading-snug text-white/80">{item.point}</p>
                    <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                  <span className="text-[12px] tabular-nums text-white/40">{item.count.toLocaleString()}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2">
      <div className="h-px w-12 bg-white/[0.08]" />
      <span className="text-[10px] uppercase tracking-[0.24em] text-white/20">No data yet</span>
    </div>
  );
}
