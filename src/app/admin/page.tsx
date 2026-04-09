'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

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

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  accent:  '#00e5a0',
  cyan:    '#00d4ff',
  blue:    '#6366f1',
  orange:  '#f97316',
  rose:    '#f43f5e',
  grid:    'rgba(255,255,255,0.04)',
  axis:    'rgba(255,255,255,0.25)',
  tooltip: '#0d1b2a',
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter:  C.cyan,
  reddit:   C.orange,
  youtube:  C.rose,
  google:   C.blue,
};

const TOOL_COLORS = [C.accent, C.cyan, C.blue, C.orange];

// ── Custom tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1b2a] border border-white/10 rounded-xl px-4 py-3 text-sm shadow-2xl backdrop-blur-sm">
      {label && <p className="text-white/50 text-xs mb-2 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-white/60 text-xs">{p.name}:</span>
          <span className="text-white font-semibold text-xs">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  trend?: { value: number; label: string };
}

function StatCard({ label, value, sub, icon, accent, trend }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0d1b2a] p-5 flex flex-col gap-3"
      style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)` }}
    >
      {/* Subtle glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, color: accent }}
        >
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.value >= 0
              ? 'bg-emerald-400/10 text-emerald-400'
              : 'bg-red-400/10 text-red-400'
          }`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-white font-bold text-2xl tracking-tight">{value}</p>
        {sub && <p className="text-white/30 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function ChartCard({
  title, subtitle, children, className = '',
}: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-[#0d1b2a] p-5 ${className}`}
      style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03)` }}
    >
      <div className="mb-5">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-white/30 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
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
      const res = await adminApi.getDashboardMetrics();
      setMetrics(res.data);
      setLastRefresh(new Date());
    } catch {
      setError('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 60 seconds
    const id = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-white/10 border-t-[#00e5a0] rounded-full animate-spin mx-auto" />
          <p className="text-white/30 text-sm">Loading dashboard...</p>
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
          <button onClick={fetchMetrics} className="btn-secondary text-sm px-5">Retry</button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const convRate = (metrics.conversion_rate * 100).toFixed(1);
  const highIntentPct = metrics.total_signals > 0
    ? Math.round((metrics.high_intent_count / metrics.total_signals) * 100)
    : 0;

  // Format platform data with colors
  const platformData = (metrics.signals_by_platform || []).map((p) => ({
    ...p,
    color: PLATFORM_COLORS[p.platform] || C.blue,
  }));

  // Shorten date labels
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return d; }
  };
  const signalsByDay = (metrics.signals_by_day || []).map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));
  const leadsByDay = (metrics.leads_by_day || []).map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  // Tool name shortener
  const shortenTool = (t: string) =>
    t.replace('cyber-path-finder', 'Path Finder')
     .replace('career-assessment', 'Assessment')
     .replace('resume-analyzer', 'Resume');

  const toolData = (metrics.leads_by_tool || []).map((t) => ({
    ...t,
    tool: shortenTool(t.tool),
  }));

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Dashboard</h1>
          <p className="text-white/30 text-xs mt-0.5">
            Last updated {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 60s
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/8 text-white/50 hover:text-white text-sm transition-all border border-white/5 disabled:opacity-40"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Signals"
          value={metrics.total_signals.toLocaleString()}
          accent={C.cyan}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatCard
          label="High Intent"
          value={metrics.high_intent_count.toLocaleString()}
          sub={`${highIntentPct}% of signals`}
          accent={C.rose}
          trend={metrics.high_intent_wow !== undefined ? { value: metrics.high_intent_wow, label: 'vs last week' } : undefined}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>}
        />
        <StatCard
          label="Leads Captured"
          value={metrics.leads_captured.toLocaleString()}
          accent={C.accent}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Conversion Rate"
          value={`${convRate}%`}
          sub="signals → leads"
          accent={C.blue}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <StatCard
          label="Avg Urgency Score"
          value={`${metrics.avg_urgency.toFixed(0)}/100`}
          sub={metrics.avg_urgency >= 70 ? 'High urgency pool' : metrics.avg_urgency >= 40 ? 'Medium urgency pool' : 'Low urgency pool'}
          accent={metrics.avg_urgency >= 70 ? C.rose : metrics.avg_urgency >= 40 ? C.orange : C.accent}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Row 1: Area charts ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Signals by Day — Area */}
        <ChartCard title="Signals Collected" subtitle="Daily ingestion volume">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signalsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSignals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.cyan} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="date" stroke="transparent" tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="transparent" tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.cyan, strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area type="monotone" dataKey="count" name="Signals" stroke={C.cyan} strokeWidth={2} fill="url(#gradSignals)" dot={false} activeDot={{ r: 5, fill: C.cyan, stroke: '#0d1b2a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Leads by Day — Area */}
        <ChartCard title="Leads Captured" subtitle="Daily lead conversions">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="date" stroke="transparent" tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="transparent" tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.accent, strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area type="monotone" dataKey="count" name="Leads" stroke={C.accent} strokeWidth={2} fill="url(#gradLeads)" dot={false} activeDot={{ r: 5, fill: C.accent, stroke: '#0d1b2a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Row 2: Platform pie + Leads by tool ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Platform Distribution — Pie */}
        <ChartCard title="Signals by Platform" subtitle="Source breakdown">
          {platformData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-white/20 text-sm">No data yet</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="count"
                    nameKey="platform"
                    cx="40%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {platformData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'capitalize' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Leads by Tool — Horizontal Bar */}
        <ChartCard title="Leads by Tool" subtitle="Which tool converts most">
          {toolData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-white/20 text-sm">No leads yet</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                  <XAxis type="number" stroke="transparent" tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="tool" stroke="transparent" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {toolData.map((_, i) => (
                      <Cell key={i} fill={TOOL_COLORS[i % TOOL_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Pain Points ── */}
      {(metrics.top_pain_points || []).length > 0 && (
        <ChartCard title="Top Pain Points" subtitle="Most common barriers detected by AI across all signals">
          <div className="space-y-2.5">
            {metrics.top_pain_points.slice(0, 8).map((item, i) => {
              const max = metrics.top_pain_points[0]?.count || 1;
              const pct = Math.round((item.count / max) * 100);
              const colors = [C.accent, C.cyan, C.blue, C.orange, C.rose];
              const color = colors[i % colors.length];
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{ background: `${color}20`, color }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/70 text-xs truncate">{item.point}</span>
                      <span className="text-white/40 text-xs ml-3 shrink-0">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* ── Row 3: GHL Sync + Urgency Distribution + Cost Per Lead ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* GHL Sync Status */}
        <ChartCard title="GHL Sync Status" subtitle="GoHighLevel CRM sync health">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">Sync rate</span>
              <span className="text-white font-bold text-lg">
                {Math.round((metrics.ghl_sync_rate || 0) * 100)}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round((metrics.ghl_sync_rate || 0) * 100)}%`,
                  background: (metrics.ghl_sync_rate || 0) >= 0.9 ? C.accent : (metrics.ghl_sync_rate || 0) >= 0.7 ? C.orange : C.rose,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white/3 rounded-xl p-3 text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Synced</p>
                <p className="text-emerald-400 font-bold text-xl">{(metrics.ghl_synced || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/3 rounded-xl p-3 text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Pending</p>
                <p className="text-yellow-400 font-bold text-xl">{(metrics.ghl_unsynced || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Urgency Distribution */}
        <ChartCard title="Urgency Distribution" subtitle="Signal urgency score breakdown">
          {(metrics.urgency_distribution || []).length === 0 ? (
            <div className="h-40 flex items-center justify-center text-white/20 text-sm">No classified signals yet</div>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.urgency_distribution} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="bucket" stroke="transparent" tick={{ fill: C.axis, fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="transparent" tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name="Signals" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {(metrics.urgency_distribution || []).map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? C.rose : i === 1 ? C.orange : C.accent} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Cost Per Lead */}
        <ChartCard title="Cost Per Lead" subtitle="Manual ad spend input — stored locally">
          <div className="space-y-4">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                Ad spend this month ($)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={adSpend}
                onChange={(e) => {
                  setAdSpend(e.target.value);
                  localStorage.setItem('emc_ad_spend', e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00e5a0]/40 placeholder:text-white/20"
              />
            </div>
            <div className="bg-white/3 rounded-xl p-4 text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Cost Per Lead</p>
              {adSpend && parseFloat(adSpend) > 0 && metrics.leads_captured > 0 ? (
                <>
                  <p className="text-white font-bold text-2xl">
                    ${(parseFloat(adSpend) / metrics.leads_captured).toFixed(2)}
                  </p>
                  <p className="text-white/30 text-xs mt-0.5">
                    ${adSpend} ÷ {metrics.leads_captured} leads
                  </p>
                </>
              ) : (
                <p className="text-white/20 text-sm">Enter ad spend above</p>
              )}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Quick stats bottom row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Signals Today',
            value: signalsByDay[signalsByDay.length - 1]?.count?.toLocaleString() ?? '—',
            color: C.cyan,
          },
          {
            label: 'HIGH INTENT Rate',
            value: `${highIntentPct}%`,
            color: C.rose,
          },
          {
            label: 'Top Platform',
            value: platformData.sort((a, b) => b.count - a.count)[0]?.platform ?? '—',
            color: C.orange,
          },
          {
            label: 'Top Tool',
            value: toolData.sort((a, b) => b.count - a.count)[0]?.tool ?? '—',
            color: C.accent,
          },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-[#0d1b2a] px-4 py-3">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">{item.label}</p>
            <p className="font-bold text-lg capitalize" style={{ color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
