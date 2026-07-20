'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Radar, UserPlus, MessagesSquare, TrendingUp, Flame, RefreshCw, Rocket,
  ArrowRight, Send, CheckCircle2, BellRing, Store, Users2,
} from 'lucide-react';
import { adminApi, SignalStats } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';
import { intentInfo, channelLabel } from '@/lib/labels';
import {
  PageHeader, StatCard, SectionCard, Card, Button, EmptyState,
  InsightCard, QuickAction, IntentBadge, greeting,
} from '@/components/admin/ui';

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

/* ── Friendly chart tooltip ─────────────────────────────────────────────────── */

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-3.5 py-2.5" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border2)', boxShadow: 'var(--a-card-shadow)' }}>
      {label && <p className="mb-1 text-[12px] font-semibold" style={{ color: 'var(--a-text-60)' }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-[13px]" style={{ color: 'var(--a-text-60)' }}>{p.name}</span>
          <span className="ml-auto text-[13px] font-bold tabular-nums" style={{ color: 'var(--a-text)' }}>{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Loading ────────────────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-lg" style={{ background: 'var(--a-card2)' }} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl" style={{ background: 'var(--a-card2)' }} />)}
      </div>
      <div className="h-40 rounded-2xl" style={{ background: 'var(--a-card2)' }} />
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

export default function AdminHomePage() {
  const theme = useWorkspaceTheme();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stats,   setStats]   = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [orgName, setOrgName] = useState<string | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  /* Company name (greeting) + whether the profile still needs finishing. */
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (!token) return;
    fetch('/api/settings/org', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { profile?: { company_name?: string; website?: string; about?: string; services?: string } | null } | null) => {
        const p = data?.profile;
        setOrgName(p?.company_name?.trim() || null);
        setProfileIncomplete(!p || !p.website?.trim() || !p.about?.trim() || !p.services?.trim());
      })
      .catch(() => {});
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, statsRes] = await Promise.allSettled([
        adminApi.getDashboardMetrics(),
        adminApi.getSignalStats(),
      ]);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data);
      else setError('We couldn’t load your numbers. Please try again.');
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  if (loading && !metrics) return <DashboardSkeleton />;

  if (error && !metrics) {
    return (
      <Card className="mx-auto max-w-md mt-10">
        <EmptyState
          icon={RefreshCw}
          title="We hit a snag"
          message={error}
          action={<Button icon={RefreshCw} onClick={fetchMetrics}>Try again</Button>}
        />
      </Card>
    );
  }
  if (!metrics) return null;

  /* ── Derived, plain-language data ── */
  const today = metrics.daily?.today ?? { linkedin_signals: 0, linkedin_high_intent: 0, leads_captured: 0, conversion_rate: 0, avg_urgency: 0 };
  const yest  = metrics.daily?.yesterday ?? { linkedin_signals: 0, linkedin_high_intent: 0, leads_captured: 0, conversion_rate: 0, avg_urgency: 0 };

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return d; }
  };
  const activityByDay = (metrics.signals_by_day || []).map((d) => ({ ...d, date: fmtDate(d.date) }));
  const leadsByDay    = (metrics.leads_by_day || []).map((d) => ({ ...d, date: fmtDate(d.date) }));

  const channels = (metrics.signals_by_platform || [])
    .map((p, i) => ({ name: channelLabel(p.platform), count: p.count, color: theme.platform[p.platform] || theme.chart[i % theme.chart.length] }))
    .sort((a, b) => b.count - a.count);
  const topChannel = channels[0];
  const channelTotal = channels.reduce((s, c) => s + c.count, 0) || 1;

  // Interest breakdown → Hot / Warm / Cool.
  const interest = (stats?.byIntentLevel || []).reduce(
    (acc, r) => {
      const t = intentInfo(r.intent_level).tone;
      if (t === 'hot') acc.hot += r.count;
      else if (t === 'warm') acc.warm += r.count;
      else if (t === 'cool') acc.cool += r.count;
      return acc;
    },
    { hot: 0, warm: 0, cool: 0 },
  );

  const pendingToCrm = metrics.ghl_unsynced || 0;
  const sentToCrm    = metrics.ghl_synced || 0;
  const hotDelta     = pctDelta(today.linkedin_high_intent, yest.linkedin_high_intent);

  /* ── Conversational insights (pick the meaningful ones) ── */
  type Insight = { icon: any; text: React.ReactNode; tone: 'good' | 'attention' | 'warning' | 'neutral'; href?: string; cta?: string };
  const insights: Insight[] = [];
  if (metrics.total_signals === 0) {
    insights.push({ icon: Rocket, tone: 'neutral', href: '/admin/settings', cta: 'Finish setup',
      text: 'Your finder hasn’t started yet — add your website and a short description in Settings and we’ll start finding buyers for you.' });
  } else {
    if (today.linkedin_high_intent > 0) {
      insights.push({ icon: Flame, tone: 'good', href: '/admin/leads', cta: 'See hot leads',
        text: <>You found <b>{today.linkedin_high_intent}</b> hot {today.linkedin_high_intent === 1 ? 'lead' : 'leads'} today{hotDelta !== 0 && <> — that’s <b>{Math.abs(hotDelta)}% {hotDelta > 0 ? 'more' : 'fewer'}</b> than yesterday</>}.</> });
    }
    if (pendingToCrm > 0) {
      insights.push({ icon: Send, tone: 'attention', href: '/admin/leads', cta: 'Review leads',
        text: <><b>{pendingToCrm}</b> {pendingToCrm === 1 ? 'lead is' : 'leads are'} ready but not yet sent to your CRM.</> });
    }
    if (topChannel) {
      insights.push({ icon: Store, tone: 'neutral',
        text: <>Most of your buyers are coming from <b>{topChannel.name}</b> right now.</> });
    }
    if (today.leads_captured > 0) {
      insights.push({ icon: CheckCircle2, tone: 'good',
        text: <>You captured <b>{today.leads_captured}</b> new {today.leads_captured === 1 ? 'lead' : 'leads'} today.</> });
    }
  }

  const hour = new Date().getHours();

  return (
    <div className="space-y-7 pb-10">

      {/* ── Greeting ── */}
      <PageHeader
        title={`${greeting(hour)}${orgName ? `, ${orgName}` : ''} 👋`}
        description="Here’s how your business is doing today."
        action={
          <Button variant="secondary" size="sm" icon={RefreshCw} loading={loading} onClick={fetchMetrics}>
            Refresh
          </Button>
        }
      />

      {/* ── Setup nudge ── */}
      {profileIncomplete && (
        <Card className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ background: 'var(--t-accent-soft, rgba(109,94,249,0.08))', borderColor: 'var(--t-accent, #6D5EF9)' }}>
          <div className="flex items-start gap-3.5">
            <span className="grid place-items-center h-11 w-11 rounded-xl shrink-0" style={{ background: 'var(--t-accent, #6D5EF9)', color: '#fff' }}>
              <Rocket size={20} aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-bold" style={{ color: 'var(--a-text)' }}>Finish setup to start finding customers</p>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed" style={{ color: 'var(--a-text-60)' }}>
                Add your website and a short description of what you do in Settings. We read your site to learn who your
                buyers are, then start finding them for you.
              </p>
            </div>
          </div>
          <Button icon={ArrowRight} onClick={() => { window.location.href = '/admin/settings'; }} className="shrink-0">
            Complete your profile
          </Button>
        </Card>
      )}

      {/* ── Today's numbers ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New buyer activity today" value={today.linkedin_signals.toLocaleString()} icon={Radar}
          trend={{ value: pctDelta(today.linkedin_signals, yest.linkedin_signals) }} hint={`Yesterday: ${yest.linkedin_signals.toLocaleString()}`} />
        <StatCard label="Hot leads today" value={today.linkedin_high_intent.toLocaleString()} icon={Flame} accent="var(--t-coral, #dc2626)"
          trend={{ value: hotDelta }} hint={`Yesterday: ${yest.linkedin_high_intent.toLocaleString()}`} />
        <StatCard label="New leads today" value={today.leads_captured.toLocaleString()} icon={UserPlus} accent="var(--t-green, #16a34a)"
          trend={{ value: pctDelta(today.leads_captured, yest.leads_captured) }} hint={`Yesterday: ${yest.leads_captured.toLocaleString()}`} />
        <StatCard label="Turned into leads" value={`${today.conversion_rate.toFixed(1)}%`} icon={TrendingUp}
          trend={{ value: pctDelta(today.conversion_rate, yest.conversion_rate) }} hint="Share of activity that became a lead" />
      </div>

      {/* ── What's happening (insights) ── */}
      {insights.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold" style={{ color: 'var(--a-text)' }}>
            <BellRing size={17} style={{ color: 'var(--t-accent, #6D5EF9)' }} aria-hidden /> What needs your attention
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {insights.slice(0, 4).map((ins, i) => (
              <InsightCard key={i} icon={ins.icon} text={ins.text} tone={ins.tone} href={ins.href} cta={ins.cta} />
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div>
        <h2 className="mb-3 text-[15px] font-semibold" style={{ color: 'var(--a-text)' }}>What would you like to do?</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction icon={Radar} label="See buyer activity" hint="People showing interest" href="/admin/signals" />
          <QuickAction icon={UserPlus} label="View your leads" hint="People you can contact" href="/admin/leads" />
          <QuickAction icon={MessagesSquare} label="Send messages" hint="AI-drafted replies" href="/admin/comms" />
          <QuickAction icon={TrendingUp} label="Your deals" hint="Close more sales" href="/admin/pipeline" />
        </div>
      </div>

      {/* ── Trends (two friendly charts) ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Buyer activity over time" subtitle="How many people showed interest each day" icon={Radar} bodyClassName="px-3 pt-2 pb-4">
          {activityByDay.length > 1 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityByDay} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.chart[1]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={theme.chart[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 5" stroke="var(--t-grid-color, rgba(0,0,0,0.05))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: theme.chart[1], strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="count" name="Buyer activity" stroke={theme.chart[1]} strokeWidth={2.5} fill="url(#gActivity)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState icon={Radar} title="No activity yet" message="Once your finder is running, you’ll see interest build up here." />}
        </SectionCard>

        <SectionCard title="New leads over time" subtitle="People you can reach out to, day by day" icon={UserPlus} bodyClassName="px-3 pt-2 pb-4">
          {leadsByDay.length > 1 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsByDay} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.accent} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 5" stroke="var(--t-grid-color, rgba(0,0,0,0.05))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: theme.axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: theme.accent, strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area type="monotone" dataKey="count" name="New leads" stroke={theme.accent} strokeWidth={2.5} fill="url(#gLeads)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState icon={UserPlus} title="No leads yet" message="Your first leads will appear here as buyers are found." />}
        </SectionCard>
      </div>

      {/* ── Interest breakdown + where buyers come from ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="How interested are they?" subtitle="Everyone we’ve found, sorted by how ready they are to buy" icon={Flame}>
          {(interest.hot + interest.warm + interest.cool) > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'hot',  label: 'Hot',  value: interest.hot,  q: 'HIGH_INTENT' },
                { key: 'warm', label: 'Warm', value: interest.warm, q: 'MEDIUM_INTENT' },
                { key: 'cool', label: 'Cool', value: interest.cool, q: 'LOW_INTENT' },
              ].map((b) => (
                <Link key={b.key} href={`/admin/signals?intent_level=${b.q}`}
                      className="rounded-xl border p-4 text-center transition-transform hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--a-border)', background: 'var(--a-card2)' }}>
                  <div className="flex justify-center mb-2"><IntentBadge value={b.q} /></div>
                  <div className="text-[26px] font-bold tabular-nums" style={{ color: 'var(--a-text)' }}>{b.value.toLocaleString()}</div>
                </Link>
              ))}
            </div>
          ) : <EmptyState icon={Flame} title="Nothing to sort yet" message="As buyers are found, we’ll group them into Hot, Warm and Cool for you." />}
        </SectionCard>

        <SectionCard title="Where your buyers come from" subtitle="The channels bringing you the most interest" icon={Users2}>
          {channels.length > 0 ? (
            <div className="space-y-3">
              {channels.slice(0, 5).map((c) => {
                const pct = Math.round((c.count / channelTotal) * 100);
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[13.5px] font-medium truncate" style={{ color: 'var(--a-text-80)' }}>{c.name}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--a-card2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[13px] font-semibold tabular-nums" style={{ color: 'var(--a-text-60)' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon={Users2} title="No channels yet" message="Connect a channel to start finding buyers." action={<Button size="sm" onClick={() => { window.location.href = '/admin/integrations'; }}>Connect an app</Button>} />}
        </SectionCard>
      </div>

      {/* ── CRM handoff (plain) ── */}
      {(sentToCrm + pendingToCrm) > 0 && (
        <SectionCard title="Sent to your CRM" subtitle="Leads we’ve passed on to your sales system" icon={Send}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--a-border)', background: 'var(--a-card2)' }}>
              <p className="text-[13px] font-medium" style={{ color: 'var(--a-text-50)' }}>Sent</p>
              <p className="mt-1 text-[24px] font-bold tabular-nums" style={{ color: 'var(--t-green, #16a34a)' }}>{sentToCrm.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--a-border)', background: 'var(--a-card2)' }}>
              <p className="text-[13px] font-medium" style={{ color: 'var(--a-text-50)' }}>Waiting to send</p>
              <p className="mt-1 text-[24px] font-bold tabular-nums" style={{ color: 'var(--t-amber, #d97706)' }}>{pendingToCrm.toLocaleString()}</p>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
