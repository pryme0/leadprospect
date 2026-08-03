'use client';

const STEPS = [
  {
    n: '01',
    title: 'Get found',
    body: 'Your business shows up on Google and AI search when buyers look for what you sell.',
    mock: <GetFoundMock />,
  },
  {
    n: '02',
    title: 'Spot ready buyers',
    body: 'SYNQ watches public posts on LinkedIn, TikTok and Instagram for people asking for exactly what you sell.',
    mock: <SpotBuyersMock />,
  },
  {
    n: '03',
    title: 'Get their contact',
    body: 'Clean, verified email and phone details for each lead — no messy lists, no duplicates.',
    mock: <ContactMock />,
  },
  {
    n: '04',
    title: 'Reach out and win',
    body: 'Message from one inbox, get a suggested reply, and book the meeting — all in one thread.',
    mock: <OutreachMock />,
  },
  {
    n: '05',
    title: 'Track every deal',
    body: 'See exactly where each lead sits — new, contacted, qualified, won — and never lose one.',
    mock: <PipelineMock />,
  },
];

export default function Pipeline() {
  return (
    <section className="relative bg-midnight py-24 text-white md:py-32">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Pinned heading */}
          <div className="lg:sticky lg:top-28 lg:col-span-4 lg:h-fit">
            <span className="font-mono-label text-mono-label uppercase text-secondary">How it works</span>
            <h2 className="font-display-lg text-display-lg-mobile mt-4 leading-[1.1] md:text-display-lg">
              One pipeline, from search to signed.
            </h2>
            <p className="mt-5 font-body-md text-body-md text-white/60">
              Five steps. SYNQ runs every one of them for you, so you spend your time closing — not searching.
            </p>
          </div>

          {/* Stacking cards */}
          <div className="lg:col-span-8">
            {STEPS.map((step, i) => (
              <div key={step.n} className="lg:pb-[26vh] last:lg:pb-0">
                <div
                  className="mb-6 last:mb-0 lg:sticky lg:mb-0"
                  style={{ top: `calc(7rem + ${i * 1.4}rem)` }}
                >
                  <div
                    className="grid gap-8 rounded-3xl border border-white/10 bg-[#0e1638] p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] md:grid-cols-5 md:p-10"
                  >
                    <div className="md:col-span-2">
                      <span className="font-mono-data text-mono-data text-white/30">{step.n}</span>
                      <h3 className="font-headline-md text-2xl mt-3 font-bold text-white">{step.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-white/55">{step.body}</p>
                    </div>
                    <div className="md:col-span-3">{step.mock}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Bespoke mini product mockups (no stock imagery) ───────────────────── */

function GetFoundMock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2 text-xs text-white/40">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-2 font-mono-label text-mono-label">ai-search.results</span>
      </div>
      <div className="rounded-xl bg-white/[0.05] p-4">
        <p className="font-mono-label text-mono-label uppercase text-tertiary">AI Overview</p>
        <p className="mt-2 text-sm text-white/75">
          &ldquo;Based on reviews, <span className="font-semibold text-white">your business</span> is a top pick for
          this in Lagos&hellip;&rdquo;
        </p>
      </div>
      <div className="mt-3 space-y-2">
        {['#1 result · Google', '#2 result · Google'].map((r) => (
          <div key={r} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50">{r}</div>
        ))}
      </div>
    </div>
  );
}

function SpotBuyersMock() {
  const rows = [
    { plat: 'LinkedIn', pct: 92, text: 'Looking for a reliable logistics partner ASAP' },
    { plat: 'TikTok', pct: 81, text: 'need to find someone who does this in lagos' },
    { plat: 'Instagram', pct: 76, text: 'DM me if you offer this, ready to pay' },
  ];
  return (
    <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {rows.map((r) => (
        <div key={r.text} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3">
          <span className="font-mono-data text-mono-data w-11 shrink-0 text-tertiary">{r.pct}%</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white/80">&ldquo;{r.text}&rdquo;</p>
            <p className="font-mono-label text-mono-label text-white/35">{r.plat}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactMock() {
  const people = [
    { name: 'A. Okonkwo', role: 'Ops Lead' },
    { name: 'F. Adebayo', role: 'Founder' },
    { name: 'C. Nwosu', role: 'Procurement' },
    { name: 'B. Mensah', role: 'Manager' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {people.map((p) => (
        <div key={p.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 h-8 w-8 rounded-full bg-secondary/30" />
          <p className="text-sm font-semibold text-white">{p.name}</p>
          <p className="text-xs text-white/40">{p.role}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono-label text-mono-label text-tertiary">email</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono-label text-mono-label text-secondary">phone</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OutreachMock() {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
        <div className="rounded-tr-xl rounded-b-xl bg-white/[0.06] p-3 text-sm text-white/75">
          Hi! I saw you&rsquo;re looking for a new supplier — can you help?
        </div>
      </div>
      <div className="flex flex-row-reverse items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/40" />
        <div className="rounded-tl-xl rounded-b-xl border border-primary/30 bg-primary/15 p-3 text-right text-sm text-white">
          Absolutely. Does Thursday work?
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
        <span className="font-mono-label text-mono-label uppercase text-tertiary">Meeting booked</span>
      </div>
    </div>
  );
}

function PipelineMock() {
  const cols: { label: string; color: string; count: number }[] = [
    { label: 'New', color: '#7C8698', count: 6 },
    { label: 'Contacted', color: '#4F8AFF', count: 4 },
    { label: 'Qualified', color: '#6D5EF9', count: 3 },
    { label: 'Won', color: '#21F2A6', count: 2 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {cols.map((c) => (
        <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="font-mono-label text-mono-label text-white/50">{c.label}</span>
          </div>
          <p className="font-mono-data text-mono-data text-lg text-white">{c.count}</p>
          <div className="mt-2 space-y-1.5">
            {Array.from({ length: Math.min(c.count, 3) }).map((_, i) => (
              <div key={i} className="h-1.5 rounded-full bg-white/[0.08]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
