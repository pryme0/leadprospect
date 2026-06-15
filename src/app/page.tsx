'use client';

import Link from 'next/link';

const heroImage =
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2400&q=85';

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
  ['8.4k', 'accounts matched'],
  ['31%', 'duplicates removed'],
  ['42%', 'response lift'],
  ['12', 'sources connected'],
];

function PlatformBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/80 shadow-sm">
      <span className="h-2 w-2 rounded-full bg-[#00CEC8]" />
      {name}
    </span>
  );
}

function LeadConsole() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#112126] shadow-2xl shadow-black/25">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff7a59]" />
          <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
          <span className="h-3 w-3 rounded-full bg-[#00CEC8]" />
        </div>
        <span className="rounded-full border border-[#00CEC8]/30 bg-[#00CEC8]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#00CEC8]">
          Live lead graph
        </span>
      </div>

      <div className="grid lg:grid-cols-[250px,1fr]">
        <aside className="border-b border-white/10 bg-[#0b1f2a] p-5 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/35">Sources</p>
          <div className="mt-5 space-y-3">
            {sourceRows.map((row) => (
              <div key={row.source} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">{row.source}</p>
                  <span className="text-xs font-black text-[#00CEC8]">{row.quality}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/45">{row.signal}</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-black tracking-tight text-white">{row.volume}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">leads</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="bg-[#FFF3D3] p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#4b6470]">Qualified queue</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-[#112126]">Ranked businesses ready for action</h3>
            </div>
            <span className="w-fit rounded-full bg-[#112126] px-4 py-2 text-xs font-black text-white">42 new today</span>
          </div>

          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.company} className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-[1fr,120px,86px] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-[#112126]">{lead.company}</p>
                    <span className="rounded-full bg-[#D9FFFB] px-2.5 py-1 text-[11px] font-black text-[#006B67]">{lead.status}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#4b6470]">{lead.source} to {lead.route}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#d7e8ee]">
                  <div className="h-full rounded-full bg-[#112126]" style={{ width: `${lead.score}%` }} />
                </div>
                <p className="text-3xl font-black tracking-tight text-[#112126] sm:text-right">{lead.score}</p>
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
      <section
        className="relative flex min-h-[92vh] items-center border-b border-black/10 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(135deg, rgba(16,21,16,0.96) 0%, rgba(16,21,16,0.82) 55%, rgba(16,21,16,0.55) 100%), url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(0,206,200,0.18),transparent_50%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#00CEC8] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00CEC8] animate-pulse" />
              Lead intelligence for modern growth teams
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
              Find the businesses<br className="hidden sm:block" /> ready to buy.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/70">
              ProspectGrid connects ad platforms, website forms, CRM records, enrichment data,
              and social intent signals so organizations can source, score, and route qualified
              leads from one workspace.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-[#00CEC8] px-7 py-3.5 text-sm font-black text-[#112126] shadow-xl shadow-black/20 transition hover:bg-white"
              >
                Create organization
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-black text-white backdrop-blur transition hover:bg-white hover:text-[#112126]"
              >
                Open console →
              </Link>
            </div>

            {/* Inline proof strip */}
            <div className="mt-14 grid grid-cols-2 gap-6 sm:flex sm:gap-10">
              {metrics.map(([value, label]) => (
                <div key={label}>
                  <p className="text-3xl font-black tracking-tight text-[#00CEC8]">{value}</p>
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
          <div className="flex min-w-max animate-[marquee_34s_linear_infinite] gap-3 px-3">
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
                Build a lead engine your sales team can trust.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/80">
                Create a workspace, connect your lead sources, and start scoring the companies
                most likely to become customers.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-[#112126] px-6 py-4 text-center text-sm font-black text-white transition hover:bg-white hover:text-[#112126]"
              >
                Create organization
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

    </main>
  );
}
