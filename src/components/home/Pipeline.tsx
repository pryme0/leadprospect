'use client';

import {
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  ContactRound,
  Copy,
  Kanban,
  Lock,
  Mail,
  MessageCircleMore,
  Paperclip,
  Phone,
  Plus,
  Radar,
  Search,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

/* Accent per step — brighter brand tones, picked for contrast on the dark band. */
const VIOLET = '#6D5EF9';
const CYAN = '#18D8FF';
const GREEN = '#21F2A6';
const AMBER = '#FFB547';

const STEPS = [
  {
    n: '01',
    icon: Search,
    accent: CYAN,
    title: 'Get found',
    body: 'Your business shows up on Google and AI search when buyers look for what you sell.',
    mock: <GetFoundMock />,
    alt: 'A Google results page where the AI overview recommends your business first.',
  },
  {
    n: '02',
    icon: Radar,
    accent: VIOLET,
    title: 'Spot ready buyers',
    body: 'SYNQ watches public posts on LinkedIn, TikTok and Instagram for people asking for exactly what you sell.',
    mock: <SpotBuyersMock />,
    alt: 'A live feed of public posts from people asking to buy, each scored by how ready they are.',
  },
  {
    n: '03',
    icon: ContactRound,
    accent: GREEN,
    title: 'Get their contact',
    body: 'Clean, verified email and phone details for each lead — no messy lists, no duplicates.',
    mock: <ContactMock />,
    alt: 'Contact cards with a verified email and phone number for each buyer.',
  },
  {
    n: '04',
    icon: MessageCircleMore,
    accent: AMBER,
    title: 'Reach out and win',
    body: 'Message from one inbox, get a suggested reply, and book the meeting — all in one thread.',
    mock: <OutreachMock />,
    alt: 'An inbox thread with a suggested reply and a booked meeting.',
  },
  {
    n: '05',
    icon: Kanban,
    accent: GREEN,
    title: 'Track every deal',
    body: 'See exactly where each lead sits — new, contacted, qualified, won — and never lose one.',
    mock: <PipelineMock />,
    alt: 'A deal board with columns for new, contacted, qualified and won.',
  },
];

export default function Pipeline() {
  return (
    <section className="relative bg-midnight py-24 text-white md:py-32">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Pinned heading */}
          <div className="min-w-0 lg:sticky lg:top-28 lg:col-span-4 lg:h-fit">
            <span className="font-mono-label text-mono-label uppercase text-secondary">How it works</span>
            <h2 className="font-display-lg text-display-lg-mobile mt-4 leading-[1.1] md:text-display-lg">
              One pipeline, from search to signed.
            </h2>
            <p className="mt-5 font-body-md text-body-md text-white/60">
              Five steps. SYNQ runs every one of them for you, so you spend your time closing — not searching.
            </p>
          </div>

          {/* Stacking cards */}
          <div className="min-w-0 lg:col-span-8">
            {STEPS.map((step, i) => (
              <div key={step.n} className="lg:pb-[26vh] last:lg:pb-0">
                <div
                  className="mb-6 last:mb-0 lg:sticky lg:mb-0"
                  style={{ top: `calc(7rem + ${i * 1.4}rem)` }}
                >
                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0e1638] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
                    {/* accent hairline along the top edge */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }}
                    />
                    <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-5 md:p-10">
                      <div className="min-w-0 md:col-span-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-lg border"
                            style={{
                              borderColor: `${step.accent}33`,
                              backgroundColor: `${step.accent}1f`,
                              color: step.accent,
                            }}
                          >
                            <step.icon size={15} strokeWidth={2} aria-hidden />
                          </span>
                          <span className="font-mono-data text-mono-data text-white/30">{step.n}</span>
                        </div>
                        <h3 className="font-headline-md text-2xl mt-4 font-bold text-white">{step.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-white/55">{step.body}</p>
                      </div>
                      <div className="min-w-0 md:col-span-3" role="img" aria-label={step.alt}>
                        {step.mock}
                      </div>
                    </div>
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

/* ── Shared mock chrome ─────────────────────────────────────────────────── */

function MockShell({ title, right, children }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5">
        <span className="h-2 w-2 rounded-full bg-[#FF5C74]/60" />
        <span className="h-2 w-2 rounded-full bg-[#FFB547]/60" />
        <span className="h-2 w-2 rounded-full bg-[#21F2A6]/60" />
        <div className="ml-1.5 min-w-0 flex-1">{title}</div>
        {right}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

/** Small filled pill that reads as a real button. Decorative — the whole mock
    is exposed to assistive tech as a single labelled image. */
function PillButton({
  children,
  color,
  filled = false,
  className = '',
}: {
  children: React.ReactNode;
  color: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold leading-none ${className}`}
      style={
        filled
          ? { backgroundColor: color, color: '#0a1128' }
          : { backgroundColor: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}38` }
      }
    >
      {children}
    </span>
  );
}

/* ── 01 · Get found ─────────────────────────────────────────────────────── */

function GetFoundMock() {
  return (
    <MockShell
      title={
        <div className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1">
          <Lock size={9} className="shrink-0 text-white/30" aria-hidden />
          <span className="truncate font-mono-label text-[10px] text-white/40">
            google.com/search?q=cold+room+installers+lagos
          </span>
        </div>
      }
    >
      <div className="rounded-xl border border-[#18D8FF]/25 bg-[#18D8FF]/[0.07] p-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#18D8FF]" aria-hidden />
          <span className="font-mono-label text-mono-label uppercase text-[#18D8FF]">AI Overview</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/80">
          For cold room installation in Lagos, <span className="font-semibold text-white">your business</span> is the
          most consistently recommended — buyers cite fast turnaround and 12-month warranty.
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <GoogleGlyph className="h-3 w-3" />
          <span className="font-mono-label text-[10px] text-white/35">4 sources · updated today</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <SerpRow rank="#1" domain="yourbusiness.ng" title="Cold room installation in Lagos — same-week fitting" highlighted />
        <SerpRow rank="#2" domain="yourbusiness.ng/pricing" title="Cold room pricing & maintenance plans" />
      </div>
    </MockShell>
  );
}

function SerpRow({
  rank,
  domain,
  title,
  highlighted = false,
}: {
  rank: string;
  domain: string;
  title: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        highlighted ? 'border-[#21F2A6]/25 bg-[#21F2A6]/[0.06]' : 'border-white/[0.08] bg-white/[0.02]'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.08] font-mono-label text-[10px] font-semibold text-white/60">
        YB
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-[#8AB4F8]">{title}</p>
        <p className="truncate font-mono-label text-[10px] text-white/35">{domain}</p>
      </div>
      <span
        className="shrink-0 rounded-md px-1.5 py-0.5 font-mono-label text-[10px] font-semibold"
        style={
          highlighted
            ? { backgroundColor: `${GREEN}1f`, color: GREEN }
            : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }
        }
      >
        {rank}
      </span>
    </div>
  );
}

/* ── 02 · Spot ready buyers ─────────────────────────────────────────────── */

function SpotBuyersMock() {
  const rows = [
    {
      Icon: LinkedInGlyph,
      brand: '#0A66C2',
      who: 'Tunde Bakare',
      kind: 'Ops Director',
      time: '12m',
      text: 'Any recommendations for a cold room installer in Lagos? Need it done this month.',
      score: 92,
      tier: 'Hot',
      tierColor: GREEN,
    },
    {
      Icon: TikTokGlyph,
      brand: '#69C9D0',
      who: '@ify.restaurants',
      kind: 'Comment',
      time: '41m',
      text: 'who does this in lagos? been searching for weeks 😩',
      score: 84,
      tier: 'Hot',
      tierColor: GREEN,
    },
    {
      Icon: InstagramGlyph,
      brand: '#E1306C',
      who: '@abujafreshmart',
      kind: 'Story reply',
      time: '2h',
      text: 'DM me your pricing, we are ready to pay this week.',
      score: 76,
      tier: 'Warm',
      tierColor: AMBER,
    },
  ];

  return (
    <MockShell
      title={
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#21F2A6] opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#21F2A6]" />
          </span>
          <span className="font-mono-label text-[10px] uppercase text-white/45">Buyer signals · live</span>
        </div>
      }
      right={
        <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-1 font-mono-label text-[10px] text-white/40">
          <SlidersHorizontal size={9} aria-hidden />
          24h
        </span>
      }
    >
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.who}
            className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${r.brand}26`, color: r.brand }}
            >
              <r.Icon className="h-3.5 w-3.5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="truncate text-[12px] font-semibold text-white/85">{r.who}</span>
                <span className="hidden shrink-0 font-mono-label text-[10px] text-white/30 sm:inline">
                  {r.kind} ·
                </span>
                <span className="shrink-0 font-mono-label text-[10px] text-white/30">{r.time}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/60">{r.text}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono-data text-[11px] font-semibold leading-none"
                style={{ backgroundColor: `${r.tierColor}1f`, color: r.tierColor }}
              >
                {r.score}
                <span className="font-mono-label text-[9px] uppercase opacity-80">{r.tier}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="font-mono-label text-[10px] text-white/30">31 more signals today</span>
        <PillButton color={VIOLET} filled>
          <Plus size={11} strokeWidth={2.5} aria-hidden />
          Add to pipeline
        </PillButton>
      </div>
    </MockShell>
  );
}

/* ── 03 · Get their contact ─────────────────────────────────────────────── */

function ContactMock() {
  const people = [
    {
      initials: 'AO',
      name: 'Adaeze Okonkwo',
      role: 'Ops Lead · Kaduna Cold Chain',
      email: 'a.okonkwo@kadunacold.ng',
      phone: '+234 803 ••• 2290',
      ring: VIOLET,
    },
    {
      initials: 'FA',
      name: 'Femi Adebayo',
      role: 'Founder · Bridgeline Foods',
      email: 'femi@bridgelinefoods.com',
      phone: '+234 706 ••• 8134',
      ring: CYAN,
    },
    {
      initials: 'CN',
      name: 'Chidi Nwosu',
      role: 'Procurement · Sterling Depot',
      email: 'c.nwosu@sterlingdepot.ng',
      phone: '+234 810 ••• 4471',
      ring: GREEN,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {people.map((p) => (
        <div key={p.name} className="rounded-2xl border border-white/[0.09] bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ backgroundColor: `${p.ring}26`, color: p.ring, boxShadow: `inset 0 0 0 1px ${p.ring}45` }}
            >
              {p.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-[12px] font-semibold text-white">{p.name}</span>
                <BadgeCheck size={12} className="shrink-0 text-[#21F2A6]" aria-hidden />
              </div>
              <p className="font-mono-label text-[10px] leading-tight text-white/35">{p.role}</p>
            </div>
          </div>

          <div className="mt-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <Mail size={11} className="shrink-0 text-white/30" aria-hidden />
              <span className="truncate text-[11px] text-white/55">{p.email}</span>
              <Copy size={10} className="ml-auto shrink-0 text-white/20" aria-hidden />
            </div>
            <div className="flex items-center gap-1.5">
              <Phone size={11} className="shrink-0 text-white/30" aria-hidden />
              <span className="truncate font-mono-data text-[11px] text-white/55">{p.phone}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <PillButton color={VIOLET} filled className="flex-1">
              <Mail size={11} strokeWidth={2.5} aria-hidden />
              Email
            </PillButton>
            <PillButton color={GREEN}>
              <Phone size={11} strokeWidth={2.5} aria-hidden />
              Call
            </PillButton>
          </div>
        </div>
      ))}

      {/* "and the rest" tile — what the real list looks like at scale */}
      <div className="flex flex-col justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] p-3 text-center">
        <div className="mx-auto flex -space-x-2">
          {['#6D5EF9', '#18D8FF', '#21F2A6'].map((c) => (
            <span
              key={c}
              className="h-6 w-6 rounded-full border-2 border-[#0e1638]"
              style={{ backgroundColor: `${c}59` }}
            />
          ))}
        </div>
        <p className="mt-2 font-mono-data text-[13px] font-semibold text-white">+128</p>
        <p className="font-mono-label text-[10px] text-white/35">verified contacts</p>
        <span className="mt-2 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-[#8AB4F8]">
          View all
          <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </div>
  );
}

/* ── 04 · Reach out and win ─────────────────────────────────────────────── */

function OutreachMock() {
  return (
    <MockShell
      title={
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6D5EF9]/25 text-[9px] font-bold text-[#6D5EF9]">
            TB
          </span>
          <span className="truncate text-[11px] font-semibold text-white/75">Tunde Bakare</span>
          <span className="inline-flex items-center gap-1 rounded bg-[#0A66C2]/20 px-1.5 py-0.5 font-mono-label text-[9px] text-[#5CA2E8]">
            <LinkedInGlyph className="h-2.5 w-2.5" />
            DM
          </span>
        </div>
      }
      right={
        <span className="rounded-md bg-[#21F2A6]/15 px-1.5 py-1 font-mono-label text-[10px] font-semibold text-[#21F2A6]">
          Replied
        </span>
      }
    >
      <div className="space-y-2.5">
        <div className="flex items-end gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[9px] font-bold text-white/50">
            TB
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/[0.07] px-3 py-2">
            <p className="text-[12px] leading-snug text-white/75">
              Saw your post — we need a cold room fitted before month end. What&rsquo;s your lead time?
            </p>
            <span className="mt-1 block font-mono-label text-[9px] text-white/25">09:12</span>
          </div>
        </div>

        <div className="flex flex-row-reverse items-end gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6D5EF9]/35 text-[9px] font-bold text-white/80">
            YB
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-br-md border border-[#6D5EF9]/30 bg-[#6D5EF9]/20 px-3 py-2">
            <p className="text-[12px] leading-snug text-white">Six working days, warranty included. Does Thursday 10am work for a site visit?</p>
            <span className="mt-1 flex items-center justify-end gap-1 font-mono-label text-[9px] text-white/40">
              09:14
              <Check size={9} strokeWidth={3} aria-hidden />
            </span>
          </div>
        </div>
      </div>

      {/* AI suggestion strip */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#FFB547]/25 bg-[#FFB547]/[0.07] px-2.5 py-2">
        <Sparkles size={12} className="shrink-0 text-[#FFB547]" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[11px] text-white/60">
          Suggested: &ldquo;I&rsquo;ll send the spec sheet ahead of Thursday.&rdquo;
        </p>
        <PillButton color={AMBER} filled>
          Use
        </PillButton>
      </div>

      {/* Composer */}
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] py-1.5 pl-3 pr-1.5">
        <span className="flex-1 truncate text-[11px] text-white/25">Write a reply…</span>
        <Paperclip size={13} className="shrink-0 text-white/25" aria-hidden />
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6D5EF9] text-white">
          <SendHorizontal size={13} strokeWidth={2.5} aria-hidden />
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-[#21F2A6]/[0.08] py-1.5">
        <CalendarCheck size={11} className="text-[#21F2A6]" aria-hidden />
        <span className="font-mono-label text-[10px] uppercase text-[#21F2A6]">Meeting booked · Thu 10:00</span>
      </div>
    </MockShell>
  );
}

/* ── 05 · Track every deal ──────────────────────────────────────────────── */

function PipelineMock() {
  const cols: { label: string; color: string; count: number; deals: { name: string; value: string }[] }[] = [
    {
      label: 'New',
      color: '#7C8698',
      count: 6,
      deals: [
        { name: 'Abuja FreshMart', value: '₦1.8m' },
        { name: 'Ify Restaurants', value: '₦640k' },
      ],
    },
    {
      label: 'Contacted',
      color: CYAN,
      count: 4,
      deals: [
        { name: 'Bridgeline Foods', value: '₦2.4m' },
        { name: 'Sterling Depot', value: '₦910k' },
      ],
    },
    {
      label: 'Qualified',
      color: VIOLET,
      count: 3,
      deals: [{ name: 'Kaduna Cold Chain', value: '₦5.2m' }],
    },
    {
      label: 'Won',
      color: GREEN,
      count: 2,
      deals: [{ name: 'Accra BuildCo', value: '₦3.1m' }],
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cols.map((c) => (
          <div key={c.label} className="rounded-xl bg-white/[0.03] p-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="truncate font-mono-label text-[10px] text-white/50">{c.label}</span>
              <span className="ml-auto font-mono-data text-[11px] font-semibold text-white/70">{c.count}</span>
            </div>

            <div className="mt-2 space-y-1.5">
              {c.deals.map((d) => (
                <div
                  key={d.name}
                  className="rounded-lg border-l-2 bg-white/[0.05] py-1.5 pl-2 pr-1.5"
                  style={{ borderLeftColor: c.color }}
                >
                  <p className="truncate text-[10px] font-medium leading-tight text-white/75">{d.name}</p>
                  <p className="mt-0.5 font-mono-data text-[10px] text-white/40">{d.value}</p>
                </div>
              ))}
              {c.count > c.deals.length && (
                <p className="pl-2 font-mono-label text-[9px] text-white/25">
                  +{c.count - c.deals.length} more
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2.5">
        <span className="inline-flex items-center gap-1.5 font-mono-label text-[10px] text-white/40">
          <TrendingUp size={11} className="text-[#21F2A6]" aria-hidden />
          ₦14.1m in play this month
        </span>
        <PillButton color={GREEN} filled>
          Mark won
        </PillButton>
      </div>
    </div>
  );
}

/* ── Brand glyphs (official marks, monochrome so they inherit currentColor) ─ */

function LinkedInGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function InstagramGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07c-1.27.06-2.15.26-2.91.56-.79.3-1.46.71-2.13 1.38S.93 3.35.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13s1.34 1.08 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.71 2.13-1.38s1.08-1.34 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.71-1.46-1.38-2.13S20.65.93 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
    </svg>
  );
}

function TikTokGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function GoogleGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}
