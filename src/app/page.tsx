'use client';

import Link from 'next/link';
import Image from 'next/image';
import HomepagePromptOrchestrator from '@/components/HomepagePromptOrchestrator';

/* ── Data ─────────────────────────────────────────────────────────────────── */

const sourceRows = [
  { source: 'Google Ads',  volume: '428', quality: '82%' },
  { source: 'Meta Ads',    volume: '311', quality: '74%' },
  { source: 'TikTok Ads',  volume: '146', quality: '67%' },
  { source: 'CRM Import',  volume: '916', quality: '88%' },
];

const leads = [
  { company: 'Northstar Clinics',   source: 'Google Ads',     score: 94, route: 'Senior AE',  status: 'Ready'    },
  { company: 'HelioPay',            source: 'TikTok Ads',     score: 81, route: 'Outbound',   status: 'Research' },
  { company: 'Aster Logistics',     source: 'CRM + LinkedIn', score: 89, route: 'Expansion',  status: 'Ready'    },
  { company: 'Cedar Home Services', source: 'Meta Ads',       score: 72, route: 'Nurture',    status: 'Watch'    },
];

const integrations = [
  { name: 'Google Ads',    bg: '#4285F4', label: 'G'   },
  { name: 'Facebook Ads',  bg: '#1877F2', label: 'f'   },
  { name: 'TikTok Ads',    bg: '#010101', label: 'T'   },
  { name: 'Instagram Ads', bg: '#E1306C', label: '✦'  },
  { name: 'LinkedIn',      bg: '#0A66C2', label: 'in'  },
  { name: 'HubSpot',       bg: '#FF7A59', label: 'H'   },
  { name: 'Salesforce',    bg: '#00A1E0', label: 'S'   },
  { name: 'Pipedrive',     bg: '#2C2C2C', label: 'P'   },
  { name: 'Webflow Forms', bg: '#4353FF', label: 'W'   },
  { name: 'Typeform',      bg: '#262627', label: 'T'   },
  { name: 'CSV Imports',   bg: '#22C55E', label: 'CSV' },
  { name: 'Zapier',        bg: '#FF4A00', label: 'Z'   },
];

const capabilities = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0-4-4m4 4-4 4M5 11l4-4m-4 4 4 4" />
      </svg>
    ),
    title: 'Source every prospect',
    body:  'Capture leads from paid ads, forms, CRM records, spreadsheets, and social intent signals without losing attribution.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Clean the buyer record',
    body:  'Deduplicate companies, resolve people, enrich missing fields, and suppress customers before they pollute your campaigns.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Score real intent',
    body:  'Rank accounts by channel quality, recent behavior, company fit, campaign velocity, and sales readiness.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
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

const testimonials = [
  {
    photo:   'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=96&h=96&q=80',
    name:    'Marcus Reid',
    title:   'Head of Growth',
    company: 'Northstar Clinics',
    quote:   "ProspectGrid cut our sales team's research time in half. We used to spend days qualifying leads from Meta and Google — now it's done before morning standup.",
  },
  {
    photo:   'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=96&h=96&q=80',
    name:    'Amara Diallo',
    title:   'Revenue Operations Lead',
    company: 'HelioPay',
    quote:   "We were burning 35% of ad spend chasing duplicates and cold contacts. ProspectGrid fixed that in the first week. Cost per qualified lead dropped by nearly a third.",
  },
  {
    photo:   'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=96&h=96&q=80',
    name:    'Daniel Osei',
    title:   'Sales Director',
    company: 'Aster Logistics',
    quote:   "The routing logic is a game-changer. Expansion accounts go to senior reps automatically, new inbound to BDRs, cold signals to nurture — all night, without anyone touching it.",
  },
];

/* ── Sub-components ───────────────────────────────────────────────────────── */

function IntegrationBadge({ name, bg, label }: { name: string; bg: string; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#334155] shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ background: bg }}
      >
        {label}
      </span>
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
        <aside className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">Sources</p>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/25">live</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {sourceRows.map((row) => (
              <div key={row.source} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#38BDF8]/30 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{row.source}</p>
                  <span className="text-xs font-bold tabular-nums text-[#38BDF8]">{row.quality}</span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8]" style={{ width: row.quality }} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-white">{row.volume}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">leads</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
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
              <div key={lead.company} className="grid items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] sm:grid-cols-[1fr,150px,auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-white">{lead.company}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyles[lead.status] ?? 'bg-white/10 text-white/70'}`}>{lead.status}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-white/45">{lead.source} → {lead.route}</p>
                </div>
                <div className="hidden h-1.5 overflow-hidden rounded-full bg-white/10 sm:block">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#38BDF8]" style={{ width: `${lead.score}%` }} />
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_65%_-10%,rgba(37,99,235,0.28),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_10%_90%,rgba(56,189,248,0.12),transparent_60%)]" />

        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-[#38BDF8] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                For teams that need revenue, not reports
              </div>

              <h1 className="text-[56px] sm:text-[68px] lg:text-[72px] font-extrabold leading-[1.0] tracking-tight text-white">
                Score every lead.<br />
                Close the ones<br />
                <span className="text-[#38BDF8]">ready to buy.</span>
              </h1>

              <p className="mt-7 text-[18px] leading-[1.7] text-white/65 max-w-lg">
                Your competitors are scoring the same leads right now. ProspectGrid identifies
                who&apos;s ready to spend — before the window closes.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="inline-flex justify-center items-center rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-7 py-4 text-base transition-colors duration-200 shadow-[0_4px_20px_rgba(37,99,235,0.40)]">
                  Start scoring free
                </Link>
                <Link href="/admin/login" className="inline-flex justify-center items-center rounded-full border border-white/20 text-white font-semibold px-7 py-4 text-base hover:bg-white/[0.08] transition-colors duration-200">
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

            {/* Product mockup + floating notification cards */}
            <div className="relative hidden lg:block">
              <div className="pointer-events-none absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.18),transparent_70%)]" />

              {/* Floating live-signal cards */}
              <div className="absolute -top-8 -left-12 z-20 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-4 py-3 shadow-xl">
                <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-sm font-semibold text-white">42 leads scored</span>
                <span className="text-xs text-white/40 ml-1">just now</span>
              </div>

              <div className="absolute -bottom-6 -left-8 z-20 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-4 py-3 shadow-xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB]/30 text-xs font-black text-white">94</div>
                <div>
                  <p className="text-xs font-semibold text-white">Northstar Clinics</p>
                  <p className="text-[11px] text-white/45">Routed → Senior AE</p>
                </div>
              </div>

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
          <div className="flex min-w-max animate-marquee gap-3 px-3 motion-reduce:[animation:none]">
            {[...integrations, ...integrations].map((item, i) => (
              <IntegrationBadge key={`${item.name}-${i}`} name={item.name} bg={item.bg} label={item.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY PROSPECTGRID ─────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-24 sm:px-6 lg:px-8 lg:py-[120px]">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[0.65fr,1.35fr] lg:items-start">

            {/* Left: sticky */}
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2563EB]">Why ProspectGrid</p>
              <h2 className="mt-5 text-[40px] sm:text-[48px] font-bold tracking-tight text-[#0B132B] leading-[1.1]">
                Stop treating every lead source like a separate report.
              </h2>
              <p className="mt-5 text-[18px] leading-[1.7] text-[#64748B] max-w-sm">
                Teams bleed speed when ads, CRM, forms, imports, and enrichment all tell different stories.
                ProspectGrid unifies the chaos into one confident lead graph.
              </p>
              <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-7 py-4 text-sm transition-colors duration-200">
                Start free today
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>

              {/* Product photo */}
              <div className="mt-8 relative overflow-hidden rounded-[20px] shadow-[0_4px_20px_rgba(15,23,42,0.10)]">
                <Image
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=75"
                  alt="Sales team reviewing lead intelligence data"
                  width={600}
                  height={360}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B]/70 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-sm font-semibold text-white">Live scoring active · 186 leads in queue</span>
                </div>
              </div>
            </div>

            {/* Right: 2×2 feature cards */}
            <div className="grid gap-5 sm:grid-cols-2">
              {capabilities.map((item, i) => (
                <div
                  key={item.title}
                  className="group rounded-[24px] border border-[#F1F5F9] bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.12)] cursor-default"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                      {item.icon}
                    </div>
                    <span className="text-sm font-black text-[#E2E8F0]">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="mt-6 text-[22px] font-semibold tracking-tight text-[#0B132B]">{item.title}</h3>
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
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2563EB]">How it works</p>
            <h2 className="mt-5 text-[40px] sm:text-[48px] font-bold tracking-tight text-[#0B132B] leading-[1.1]">
              Start scoring in under 5 minutes.
            </h2>
            <p className="mt-5 text-[18px] leading-[1.7] text-[#64748B]">
              Connect once. Score forever. Your pipeline starts filling the moment you link your first channel.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-[24px] border border-[#F1F5F9] bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.10)]"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] text-sm font-black">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="text-[20px] font-semibold tracking-tight text-[#0B132B]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-[#64748B]">{step.body}</p>
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute -right-3 top-10 z-10 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-[#E2E8F0] bg-white shadow-sm">
                    <svg className="h-3 w-3 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-[#0B132B] hover:bg-[#2563EB] text-white font-semibold px-8 py-4 text-sm transition-colors duration-200">
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
            <Link href="/admin/pipeline" className="w-fit rounded-full border border-white/15 bg-white/[0.08] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB] hover:border-[#2563EB] whitespace-nowrap">
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
            Results from revenue teams using ProspectGrid
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

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] px-4 py-24 sm:px-6 lg:px-8 lg:py-[120px]">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-xl text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2563EB]">What teams say</p>
            <h2 className="mt-5 text-[40px] sm:text-[48px] font-bold tracking-tight text-[#0B132B] leading-[1.1]">
              Real results, real revenue.
            </h2>
            <p className="mt-4 text-[18px] leading-[1.7] text-[#64748B]">
              From growth teams who replaced spreadsheets and guesswork with a live lead graph.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-6 rounded-[24px] border border-[#F1F5F9] bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.07)]"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="h-4 w-4 text-[#FFC107]" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="flex-1 text-[16px] leading-[1.7] text-[#334155]">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 border-t border-[#F1F5F9] pt-5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-[#E2E8F0]">
                    <Image
                      src={t.photo}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#0B132B]">{t.name}</p>
                    <p className="text-[12px] text-[#64748B]">{t.title} · {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#F8FAFC] px-4 pb-24 sm:px-6 lg:px-8 lg:pb-[120px]">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1e3a8a] via-[#2563EB] to-[#1D4ED8] p-10 sm:p-14 lg:p-16 text-white shadow-[0_20px_60px_rgba(37,99,235,0.30)]">
            {/* Background image overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
              <Image
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=60"
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                aria-hidden
              />
            </div>
            <div className="relative grid gap-10 lg:grid-cols-[1fr,280px] lg:items-end">
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
                <Link href="/signup" className="text-center rounded-full bg-white text-[#2563EB] font-semibold px-7 py-4 text-sm hover:bg-[#F8FAFC] transition-colors duration-200 shadow-sm">
                  Start scoring free
                </Link>
                <Link href="/admin/login" className="text-center rounded-full border border-white/25 bg-white/10 text-white font-semibold px-7 py-4 text-sm hover:bg-white/20 transition-colors duration-200">
                  Sign in to workspace
                </Link>
                <p className="text-center text-[11px] text-white/40 mt-1">No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomepagePromptOrchestrator />
    </div>
  );
}
