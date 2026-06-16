'use client';

import Link from 'next/link';
import Image from 'next/image';
import HomepagePromptOrchestrator from '@/components/HomepagePromptOrchestrator';

const heroImage =
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=70';

const sourceRows = [
  { source: 'Google Ads', volume: '428', quality: '82%', signal: 'High-intent keyword + pricing visit' },
  { source: 'Meta Ads', volume: '311', quality: '74%', signal: 'Lead form + duplicate check' },
  { source: 'TikTok Ads', volume: '146', quality: '67%', signal: 'Video engagement + retarget click' },
  { source: 'CRM Import', volume: '916', quality: '88%', signal: 'Expansion account + new contact' },
];

const leads = [
  { company: 'Northstar Clinics', source: 'Google Ads', score: 94, route: 'Senior AE', status: 'Ready' },
  { company: 'HelioPay', source: 'TikTok Ads', score: 81, route: 'Outbound', status: 'Research' },
  { company: 'Aster Logistics', source: 'CRM + LinkedIn', score: 89, route: 'Expansion', status: 'Ready' },
  { company: 'Cedar Home Services', source: 'Meta Ads', score: 72, route: 'Nurture', status: 'Watch' },
];

const integrations = [
  'Google Ads', 'Facebook Ads', 'TikTok Ads', 'Instagram Ads',
  'LinkedIn', 'HubSpot', 'Salesforce', 'Pipedrive',
  'Webflow Forms', 'Typeform', 'CSV Imports', 'Zapier',
];

const capabilities = [
  {
    title: 'Source every prospect',
    body: 'Capture leads from paid ads, forms, CRM records, spreadsheets, and social intent signals without losing attribution.',
  },
  {
    title: 'Clean the buyer record',
    body: 'Deduplicate companies, resolve people, enrich missing fields, and suppress customers before they pollute your campaigns.',
  },
  {
    title: 'Score real intent',
    body: 'Rank accounts by channel quality, recent behavior, company fit, campaign velocity, and sales readiness.',
  },
  {
    title: 'Route the next action',
    body: 'Move qualified businesses to sales, nurture, retargeting, suppression, or agency client queues with clear ownership.',
  },
];

const metrics = [
  ['8.4k', 'buyers identified'],
  ['42%', 'more replies from ready-to-buy accounts'],
  ['31%', 'less wasted ad spend'],
  ['12', 'sources, one pipeline'],
];

function PlatformBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/80 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-[#00CEC8]" />
      {name}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  Ready: 'bg-[#00CEC8]/15 text-[#5fe9e4] ring-1 ring-inset ring-[#00CEC8]/30',
  Research: 'bg-sky-400/15 text-sky-300 ring-1 ring-inset ring-sky-400/30',
  Watch: 'bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/30',
};

function LeadConsole() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#13262d] to-[#0d1c22] shadow-2xl shadow-black/40 ring-1 ring-white/[0.04]">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff7a59]" />
          <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
          <span className="h-3 w-3 rounded-full bg-[#00CEC8]" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#00CEC8]/30 bg-[#00CEC8]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00CEC8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00CEC8] animate-pulse" />
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
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#00CEC8]/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{row.source}</p>
                  <span className="text-xs font-bold tabular-nums text-[#00CEC8]">{row.quality}</span>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0a9b97] to-[#00CEC8]"
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
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#00CEC8]/80">Qualified queue</p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">Ranked businesses ready for action</h3>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00CEC8]" />
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
                    className="h-full rounded-full bg-gradient-to-r from-[#00CEC8] to-[#7af5f0]"
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

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#F8FBFA] text-[#112126]">

      {/* ── Hero ── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden border-b border-black/10">
        {/* Base image: instant LCP + fallback when video is absent or reduced-motion is on */}
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Background video: drop a file at /public/hero-bg.mp4 (and optional .webm).
            Hidden for reduced-motion users; falls back to the image above if missing. */}
        <video
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/hero-bg.webm" type="video/webm" />
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,21,16,0.96)_0%,rgba(16,21,16,0.82)_55%,rgba(16,21,16,0.55)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(0,206,200,0.18),transparent_50%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#00CEC8] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00CEC8] animate-pulse" />
              For businesses that need paying customers, not just leads
            </p>
            <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
              Get more<br className="hidden sm:block" /> paying customers.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/70">
              ProspectGrid pulls every lead from your ads, forms, and CRM into one place,
              scores who is actually ready to spend, and sends your team straight to the
              buyers worth chasing — so you stop paying for prospects who never convert.
            </p>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="rounded-full bg-[#00CEC8] px-8 py-4 text-base font-bold text-[#112126] shadow-xl shadow-black/20 transition hover:bg-white"
              >
                Get more customers
              </Link>
              <Link
                href="/admin/login"
                className="text-sm font-semibold text-white/70 underline-offset-4 transition hover:text-white hover:underline"
              >
                Already have an account? Sign in
              </Link>
            </div>

            {/* Inline proof strip */}
            <div className="mt-14 grid grid-cols-2 gap-6 sm:flex sm:gap-10">
              {metrics.map(([value, label]) => (
                <div key={label}>
                  <p className="text-3xl font-extrabold tracking-tight text-[#00CEC8]">{value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrations marquee ── */}
      <section className="border-b border-black/10 bg-[#112126] py-5 text-white">
        <div className="flex gap-3 overflow-hidden">
          <div className="flex min-w-max animate-[marquee_34s_linear_infinite] gap-3 px-3 motion-reduce:[animation:none]">
            {[...integrations, ...integrations].map((item, index) => (
              <PlatformBadge key={`${item}-${index}`} name={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="bg-[#F8FBFA] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr,1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#4b6470]">Why it matters</p>
            <h2 className="mt-5 max-w-xl text-4xl font-black tracking-tight sm:text-5xl">
              Stop treating every lead source like a separate report.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[#4b6470]">
              Teams waste speed when ads, CRM, forms, imports, and enrichment all tell different stories.
              ProspectGrid turns that chaos into one confident lead graph.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((item, index) => (
              <div
                key={item.title}
                className="min-h-[220px] rounded-[26px] border border-black/10 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="text-sm font-black text-[#EB4203]">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-8 text-xl font-black tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4b6470]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Console showcase ── */}
      <section className="relative border-y border-black/10 bg-[#112126] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,206,200,0.10),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00CEC8]">Command center</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Source quality, score, and routing — one live workspace.
              </h2>
            </div>
            <Link
              href="/admin/pipeline"
              className="w-fit rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-[#EB4203] hover:border-[#EB4203]"
            >
              View pipeline →
            </Link>
          </div>
          <LeadConsole />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[#F8FBFA] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] bg-[#EB4203] p-8 text-white shadow-2xl shadow-[#EB4203]/20 sm:p-12 lg:p-16">
          <div className="grid gap-8 lg:grid-cols-[1fr,320px] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/70">Start today</p>
              <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
                Turn your marketing spend into paying customers.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/80">
                Connect your ad accounts, forms, and CRM in minutes. ProspectGrid scores every
                lead and points your team at the ones ready to buy.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-[#112126] px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white hover:text-[#112126]"
              >
                Get more customers
              </Link>
              <Link
                href="/admin/login"
                className="rounded-full border border-white/25 bg-white/15 px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white hover:text-[#112126]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lead-capture funnel: timed + exit-intent prompt, UTM-aware */}
      <HomepagePromptOrchestrator />

    </main>
  );
}
