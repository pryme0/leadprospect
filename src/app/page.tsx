'use client';

import Link from 'next/link';
import HomepagePromptOrchestrator from '@/components/HomepagePromptOrchestrator';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const sourceRows = [
  { source: 'Google Ads',  volume: '428', quality: '82%', signal: 'High-intent keyword + pricing visit' },
  { source: 'Meta Ads',    volume: '311', quality: '74%', signal: 'Lead form + duplicate check'         },
  { source: 'TikTok Ads',  volume: '146', quality: '67%', signal: 'Video engagement + retarget click'   },
  { source: 'CRM Import',  volume: '916', quality: '88%', signal: 'Expansion account + new contact'     },
];

const leads = [
  { company: 'Northstar Clinics',     source: 'Google Ads',      score: 94, route: 'Senior AE',  status: 'Ready'    },
  { company: 'HelioPay',              source: 'TikTok Ads',      score: 81, route: 'Outbound',   status: 'Research' },
  { company: 'Aster Logistics',       source: 'CRM + LinkedIn',  score: 89, route: 'Expansion',  status: 'Ready'    },
  { company: 'Cedar Home Services',   source: 'Meta Ads',        score: 72, route: 'Nurture',    status: 'Watch'    },
];

const integrations = [
  'Google Ads', 'Facebook Ads', 'TikTok Ads', 'Instagram Ads',
  'LinkedIn', 'HubSpot', 'Salesforce', 'Pipedrive',
  'Webflow Forms', 'Typeform', 'CSV Imports', 'Zapier',
];

const capabilities = [
  {
    title: 'Source every prospect',
    body:  'Capture leads from paid ads, forms, CRM records, spreadsheets, and social intent signals without losing attribution.',
  },
  {
    title: 'Clean the buyer record',
    body:  'Deduplicate companies, resolve people, enrich missing fields, and suppress customers before they pollute your campaigns.',
  },
  {
    title: 'Score real intent',
    body:  'Rank accounts by channel quality, recent behavior, company fit, campaign velocity, and sales readiness.',
  },
  {
    title: 'Route the next action',
    body:  'Move qualified businesses to sales, nurture, retargeting, suppression, or agency client queues with clear ownership.',
  },
];

const steps = [
  {
    title: 'Connect your channels',
    body:  'Link Google Ads, Meta, TikTok, LinkedIn, HubSpot, Salesforce and more in minutes. No dev work needed.',
  },
  {
    title: 'Capture every lead',
    body:  'Every form fill, ad click, CRM record, and import flows into one unified lead graph. Nothing falls through.',
  },
  {
    title: 'Score real intent',
    body:  'Every account ranked by behavior, fit, source quality, and buying signals — automatically, in real time.',
  },
  {
    title: 'Route and close',
    body:  'Top prospects go to sales. Others to nurture. The rest suppressed. Zero manual work. Pure pipeline.',
  },
];

const metrics = [
  ['8.4k', 'buyers identified'],
  ['42%',  'more replies from warm accounts'],
  ['31%',  'less wasted ad spend'],
  ['12',   'sources, one pipeline'],
];

/* ── Sub-components ───────────────────────────────────────────────────────── */

function IntegrationBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#334155] shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
      {name}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  Ready:    'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/25',
  Research: 'bg-sky-500/15 text-sky-400 ring-1 ring-inset ring-sky-500/25',
  Watch:    'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25',
};

function LeadConsole() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#13262d] to-[#0d1c22] shadow-[0_20px_60px_rgba(0,0,0,0.40)] ring-1 ring-white/[0.04]">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff7a59]" />
          <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
          <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#38BDF8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
          Live lead graph
        </span>
      </div>

      <div className="grid lg:grid-cols-[260px,1fr]">
        {/* Sources rail */}
        <aside className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">Sources</p>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/25">live</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {sourceRows.map((row) => (
              <div
                key={row.source}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#38BDF8]/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{row.source}</p>
                  <span className="text-xs font-bold tabular-nums text-[#38BDF8]">{row.quality}</span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8]"
                    style={{ width: row.quality }}
                  />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-white">{row.volume}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">leads</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Qualified queue */}
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#38BDF8]/80">Qualified queue</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Ranked businesses ready for action</h3>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              42 new today
            </span>
          </div>

          <div className="space-y-2.5">
            {leads.map((lead) => (
              <div
                key={lead.company}
                className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] sm:grid-cols-[1fr,150px,auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-white">{lead.company}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyles[lead.status] ?? 'bg-white/10 text-white/70'}`}>
                      {lead.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-white/45">{lead.source} → {lead.route}</p>
                </div>
                <div className="hidden h-1.5 overflow-hidden rounded-full bg-white/10 sm:block">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8]"
                    style={{ width: `${lead.score}%` }}
                  />
                </div>
                <div className="flex items-baseline gap-1 sm:justify-end">
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-white">{lead.score}</span>
                  <span className="text-xs font-medium text-white/30">/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="overflow-hidden bg-[#F8FAFC]">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center bg-[#0B132B] overflow-hidden">
        {/* Radial glow layers */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_65%_-10%,rgba(37,99,235,0.28),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_10%_90%,rgba(56,189,248,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_85%_70%,rgba(37,99,235,0.10),transparent_55%)]" />

        <div className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <div>
              {/* Badge */}
              <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-[#38BDF8] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                For teams that need revenue, not reports
              </div>

              {/* H1 */}
              <h1 className="text-[56px] sm:text-[68px] lg:text-[72px] font-extrabold leading-[1.0] tracking-tight text-white">
                Score every lead.<br />
                Close the ones<br />
                <span className="text-[#38BDF8]">ready to buy.</span>
              </h1>

              {/* Body */}
              <p className="mt-7 text-[18px] leading-[1.7] text-white/65 max-w-lg">
                Your competitors are scoring the same leads right now. ProspectGrid identifies
                who&apos;s ready to spend — before the window closes.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="inline-flex justify-center items-center rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-7 py-4 text-base transition-colors duration-200 shadow-[0_4px_20px_rgba(37,99,235,0.40)]"
                >
                  Start scoring free
                </Link>
                <Link
                  href="/admin/login"
                  className="inline-flex justify-center items-center rounded-full border border-white/20 text-white font-semibold px-7 py-4 text-base hover:bg-white/[0.08] transition-colors duration-200"
                >
                  See it live →
                </Link>
              </div>

              {/* Metrics strip */}
              <div className="mt-14 grid grid-cols-2 gap-y-6 gap-x-8 sm:flex sm:gap-10">
                {metrics.map(([value, label]) => (
                  <div key={label}>
                    <p className="text-[32px] font-extrabold tracking-tight text-[#38BDF8] leading-none">{value}</p>
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35 max-w-[100px] sm:max-w-none leading-relaxed">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: product mockup */}
            <div className="relative hidden lg:block">
              <div className="pointer-events-none absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.18),transparent_70%)]" />
              <div className="relative">
                <LeadConsole />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS MARQUEE ─────────────────────────────────────────── */}
      <section className="border-y border-[#E2E8F0] bg-white py-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#94A3B8] mb-5">
          Works with every platform you already use
        </p>
        <div className="flex gap-3 overflow-hidden">
          <div className="flex min-w-max animate-[marquee_34s_linear_infinite] gap-3 px-3 motion-reduce:[animation:none]">
            {[...integrations, ...integrations].map((item, i) => (
              <IntegrationBadge key={`${item}-${i}`} name={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY PROSPECTGRID ─────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-24 sm:px-6 lg:px-8 lg:py-[120px]">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[0.65fr,1.35fr] lg:items-start">

            {/* Left: sticky headline */}
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2563EB]">Why ProspectGrid</p>
              <h2 className="mt-5 text-[40px] sm:text-[48px] font-bold tracking-tight text-[#0B132B] leading-[1.1]">
                Stop treating every lead source like a separate report.
              </h2>
              <p className="mt-5 text-[18px] leading-[1.7] text-[#64748B] max-w-sm">
                Teams bleed speed when ads, CRM, forms, imports, and enrichment all tell different stories.
                ProspectGrid unifies the chaos into one confident lead graph.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-7 py-4 text-sm transition-colors duration-200"
              >
                Start free today
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            {/* Right: 2×2 feature cards */}
            <div className="grid gap-5 sm:grid-cols-2">
              {capabilities.map((item, i) => (
                <div
                  key={item.title}
                  className="group rounded-[24px] border border-[#F1F5F9] bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.12)] cursor-default"
                >
                  <span className="text-sm font-black text-[#2563EB]">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-6 text-[22px] font-semibold tracking-tight text-[#0B132B]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.7] text-[#64748B]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] px-4 py-24 sm:px-6 lg:px-8 lg:py-[120px]">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2563EB]">How it works</p>
            <h2 className="mt-5 text-[40px] sm:text-[48px] font-bold tracking-tight text-[#0B132B] leading-[1.1]">
              Start scoring in under 5 minutes.
            </h2>
            <p className="mt-5 text-[18px] leading-[1.7] text-[#64748B]">
              Connect once. Score forever. Your pipeline starts filling the moment you link your first channel.
            </p>
          </div>

          {/* Steps grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-[24px] border border-[#F1F5F9] bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.10)]"
              >
                {/* Step number */}
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] text-sm font-black">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="text-[20px] font-semibold tracking-tight text-[#0B132B]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-[#64748B]">{step.body}</p>

                {/* Connector arrow (not on last) */}
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 lg:flex h-6 w-6 items-center justify-center rounded-full border border-[#E2E8F0] bg-white shadow-sm">
                    <svg className="h-3 w-3 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#0B132B] hover:bg-[#2563EB] text-white font-semibold px-8 py-4 text-sm transition-colors duration-200"
            >
              Get started — it&apos;s free
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── LIVE CONSOLE ─────────────────────────────────────────────────── */}
      <section className="relative bg-[#0B132B] px-4 py-24 sm:px-6 lg:px-8 lg:py-[120px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(37,99,235,0.18),transparent_65%)]" />
        <div className="relative mx-auto max-w-7xl">

          <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#38BDF8]">Command center</p>
              <h2 className="mt-5 max-w-2xl text-[40px] sm:text-[48px] font-bold tracking-tight text-white leading-[1.1]">
                Your entire lead graph, live.
              </h2>
              <p className="mt-4 max-w-xl text-[18px] leading-[1.7] text-white/55">
                Source quality, intent scores, and routing decisions — all in one workspace, updating in real time.
              </p>
            </div>
            <Link
              href="/admin/pipeline"
              className="w-fit rounded-full border border-white/15 bg-white/[0.08] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB] hover:border-[#2563EB] whitespace-nowrap"
            >
              View pipeline →
            </Link>
          </div>

          <LeadConsole />
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ───────────────────────────────────────────── */}
      <section className="border-y border-[#E2E8F0] bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-10 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#94A3B8]">
            Results from teams using ProspectGrid
          </p>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {metrics.map(([value, label]) => (
              <div key={label} className="text-center">
                <p className="text-[40px] sm:text-[48px] font-extrabold tracking-tight text-[#0B132B] leading-none">{value}</p>
                <p className="mt-3 text-[13px] font-medium text-[#64748B] leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] px-4 py-24 sm:px-6 lg:px-8 lg:py-[120px]">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[32px] bg-gradient-to-br from-[#1e3a8a] via-[#2563EB] to-[#1D4ED8] p-10 sm:p-14 lg:p-16 text-white shadow-[0_20px_60px_rgba(37,99,235,0.30)]">
            <div className="grid gap-10 lg:grid-cols-[1fr,280px] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/50 mb-5">Start today</p>
                <h2 className="text-[40px] sm:text-[52px] font-bold tracking-tight leading-[1.1]">
                  Every day without scoring is revenue going to your competitors.
                </h2>
                <p className="mt-6 text-[18px] leading-[1.7] text-white/70 max-w-2xl">
                  Connect your ad accounts, forms, and CRM in minutes. ProspectGrid scores every lead
                  and points your team at the ones ready to buy — right now, before they talk to someone else.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-stretch">
                <Link
                  href="/signup"
                  className="text-center rounded-full bg-white text-[#2563EB] font-semibold px-7 py-4 text-sm hover:bg-[#F8FAFC] transition-colors duration-200 shadow-sm"
                >
                  Start scoring free
                </Link>
                <Link
                  href="/admin/login"
                  className="text-center rounded-full border border-white/25 bg-white/10 text-white font-semibold px-7 py-4 text-sm hover:bg-white/20 transition-colors duration-200"
                >
                  Sign in to workspace
                </Link>
                <p className="text-center text-[11px] text-white/40 mt-1">
                  No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lead-capture funnel: timed + exit-intent prompt, UTM-aware */}
      <HomepagePromptOrchestrator />
    </div>
  );
}
