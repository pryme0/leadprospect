import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'About SYNQ — The Command Center for Revenue Teams',
  description:
    'SYNQ builds the revenue intelligence layer that unifies buying signals, AI scoring, and automated routing. Learn our mission, our principles, and where we are headed.',
  path: '/about',
  keywords: ['about SYNQ', 'revenue intelligence company', 'lead intelligence platform', 'sales technology'],
});

const STATS = [
  { value: '500+', label: 'Revenue teams' },
  { value: '50M+', label: 'Signals processed daily' },
  { value: '312%', label: 'Avg. pipeline growth' },
  { value: '14d', label: 'Shorter sales cycle' },
];

const VALUES = [
  {
    icon: 'sensors',
    color: 'text-primary',
    ring: 'bg-primary/10',
    title: 'Signal over noise',
    body: 'Every team drowns in data and starves for insight. We turn raw activity into the two or three signals that actually move a deal forward.',
  },
  {
    icon: 'bolt',
    color: 'text-tertiary',
    ring: 'bg-tertiary/10',
    title: 'Speed to lead',
    body: 'The first team to respond wins. Our routing and automation collapse the gap between intent and action to near zero.',
  },
  {
    icon: 'engineering',
    color: 'text-secondary',
    ring: 'bg-secondary/10',
    title: 'Built for operators',
    body: 'RevOps runs the modern go-to-market motion. We build for the people wiring the systems, not just the dashboards they present.',
  },
  {
    icon: 'verified_user',
    color: 'text-primary',
    ring: 'bg-primary/10',
    title: 'Data you can trust',
    body: 'Deduplicated, attributed, and enriched. If a number shows up in SYNQ, a rep should be able to act on it without second-guessing.',
  },
];

const PRINCIPLES = [
  {
    step: '01',
    title: 'Unify every channel',
    body: 'Ads, forms, CRM, imports, and social buying signals land in one high-fidelity feed — no more stitching spreadsheets together by hand.',
  },
  {
    step: '02',
    title: 'Score with intent',
    body: 'Proprietary models read behavior in real time and rank accounts by how likely they are to convert, so reps always work the right lead first.',
  },
  {
    step: '03',
    title: 'Route without latency',
    body: 'The moment a lead qualifies, it lands with the right rep — matched on territory, expertise, and load, with zero manual triage.',
  },
];

export default function AboutPage() {
  return (
    <main className="relative pt-32 pb-stack-lg overflow-hidden">
      <div className="hero-glow -top-40 -left-20" />
      <div className="hero-glow top-1/3 -right-20" />

      {/* Hero */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-glass-stroke mb-6">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="font-mono-label text-mono-label uppercase text-on-surface-variant">Our Mission</span>
          </div>
          <h1 className="font-display-xl text-display-lg-mobile md:text-display-xl text-white mb-6">
            We&apos;re building the nervous system for <span className="text-primary">revenue teams.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
            Modern sales teams don&apos;t have a data problem — they have a signal problem. SYNQ exists to turn the noise
            of cross-channel activity into a clear, ranked, actionable feed so every rep spends their time on the deals
            most likely to close.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="btn-primary px-8 py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 transition-all flex items-center gap-2"
            >
              Start free trial
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <Link
              href="/contact"
              className="glass-card px-8 py-4 rounded-xl text-white font-bold text-lg border border-glass-stroke hover:bg-white/10 transition-all"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="glass-card rounded-[2rem] p-8 md:p-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display-lg text-4xl md:text-5xl font-bold gradient-text mb-2">{s.value}</p>
              <p className="font-mono-label text-mono-label uppercase text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="grid lg:grid-cols-2 gap-stack-lg items-center">
          <div>
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-6">Why we started SYNQ</h2>
            <div className="space-y-5 font-body-md text-body-md text-on-surface-variant">
              <p>
                We spent years inside revenue orgs watching great reps lose deals they never should have — not because
                they weren&apos;t good, but because the signal telling them to act arrived a week too late, buried in a
                report nobody opened.
              </p>
              <p>
                Meanwhile the buying intent was everywhere: an ad click, a pricing-page visit, a competitor mention on
                LinkedIn, a form fill on an old campaign. The data existed. It just lived in ten disconnected tools that
                never talked to each other.
              </p>
              <p>
                SYNQ is our answer. One command center that captures every signal, scores it with intent, dedupes and
                enriches it, and routes it to the right person before the moment passes. That&apos;s the whole idea —
                and it&apos;s the thing we obsess over every day.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-container/20 to-secondary-container/20 rounded-full blur-3xl" />
            <div className="relative glass-card rounded-[2rem] p-2 glow-primary">
              <img
                alt="SYNQ revenue intelligence dashboard"
                className="w-full h-auto rounded-[1.6rem] object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH5FSaQOeqy4Six6wNOcH4V1CRQb5eil6hTuxaW5ciIIWB4WEkgA8nrAhmJGpPwyS48f3DQnR-utAo1BmS4WjuPfP1SvkBiPRi_j6sGNO3AA_euAiEptBELOWtlYDfINRpRuJhRy0L4dL35Okw9m6qBM7Tpw-xzjmSyW68oJA3oVL67RmRab1EDp-tl-PXUUD3MtjabLjCnyYtEBwANuJPH7TSq_MECI_jDfiiJcKa2MgSUDx174O8cN0L0QuYS1Ff6B--P8bpzgTV"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-4">What we believe</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Four principles guide every decision we make — from the models we train to the buttons we ship.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((v) => (
            <div key={v.title} className="glass-card p-6 rounded-2xl space-y-4 hover:bg-white/[0.04] transition-colors">
              <div className={`w-12 h-12 rounded-xl ${v.ring} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${v.color} text-2xl`}>{v.icon}</span>
              </div>
              <h3 className="font-headline-md text-xl text-white">{v.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How SYNQ works / principles */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="glass-card rounded-[2rem] p-8 md:p-14 relative overflow-hidden">
          <div className="mesh-gradient-overlay absolute inset-0 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-3">
              The model we build around
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-12">
              Capture, score, route. Everything we ship reinforces one of these three moves.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {PRINCIPLES.map((p) => (
                <div key={p.step}>
                  <p className="font-mono-data text-mono-data text-primary mb-3">{p.step}</p>
                  <h3 className="font-headline-md text-headline-md text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-6">
            Ready to work the right accounts first?
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10">
            Join the revenue teams using SYNQ to turn scattered signals into a single, ranked pipeline.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/signup"
              className="btn-primary px-10 py-5 rounded-xl text-white font-bold text-xl hover:brightness-110 transition-all flex items-center gap-3"
            >
              Create workspace
              <span className="material-symbols-outlined text-2xl">add_circle</span>
            </Link>
            <Link
              href="/contact"
              className="text-on-surface-variant hover:text-primary transition-colors font-body-md font-bold"
            >
              or contact our team →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
