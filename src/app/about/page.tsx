import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'About SYNQ — Get Found and Get Customers',
  description:
    'SYNQ helps African businesses get found on Google and AI search, and connect with people who are ready to buy. Learn who we are and why we started.',
  path: '/about',
  keywords: ['about SYNQ', 'get found online', 'get more customers', 'small business marketing Africa'],
});

const STATS = [
  { value: 'Built for Africa', label: 'Made for local businesses' },
  { value: 'Real buyers only', label: 'People ready to buy' },
  { value: 'No cold calling', label: 'They come to you' },
  { value: 'Cancel anytime', label: 'No long contracts' },
];

const VALUES = [
  {
    icon: 'sensors',
    color: 'text-primary',
    ring: 'bg-primary/10',
    title: 'Real buyers, not noise',
    body: 'Chasing everyone wastes your time. We help you focus on the few people who are actually looking to buy what you sell.',
  },
  {
    icon: 'bolt',
    color: 'text-tertiary',
    ring: 'bg-tertiary/10',
    title: 'Reach people while they’re still interested',
    body: 'The sooner you reach out, the better your chances. We help you connect with people while they still want to hear from you.',
  },
  {
    icon: 'engineering',
    color: 'text-secondary',
    ring: 'bg-secondary/10',
    title: 'Built for everyday business owners',
    body: 'You do not need to be a tech person to use SYNQ. We keep things simple so you can run your business, not fight with tools.',
  },
  {
    icon: 'verified_user',
    color: 'text-primary',
    ring: 'bg-primary/10',
    title: 'Contacts you can actually use',
    body: 'No messy lists or duplicate names. You get clean, usable contacts you can reach out to right away.',
  },
];

const PRINCIPLES = [
  {
    step: '01',
    title: 'Get found',
    body: 'We help your business show up on Google and AI search, so people can find you when they are looking for what you offer.',
  },
  {
    step: '02',
    title: 'Find ready buyers',
    body: 'We help you spot the people who are looking to buy right now, so you spend your time on the ones who matter.',
  },
  {
    step: '03',
    title: 'Reach out and win',
    body: 'We put clean, usable contacts in front of you, so you can reach out to the right person and win the sale.',
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
          <h1 className="font-display-xl text-display-lg-mobile md:text-display-xl text-on-surface mb-6">
            We help African businesses <span className="text-primary">get found and get customers.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
            Growing a business is hard when the right people can&apos;t find you. SYNQ helps your business get found on
            Google and AI search, and connect with people who are ready to buy. Less guessing, more real customers.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="btn-primary px-8 py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 transition-all flex items-center gap-2"
            >
              Start free
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 rounded-xl text-on-surface font-bold text-lg border border-outline-variant bg-white hover:bg-surface-container transition-all"
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
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-6">Why we started SYNQ</h2>
            <div className="space-y-5 font-body-md text-body-md text-on-surface-variant">
              <p>
                We watched good businesses struggle to grow. Not because their product was bad, but because the people
                looking to buy could not find them. Customers were out there searching, and the sale went to whoever
                showed up first.
              </p>
              <p>
                Getting found online felt like a full-time job. You had to worry about Google, social media, and now AI
                search too. Most business owners do not have the time or a big team to keep up with all of it.
              </p>
              <p>
                SYNQ is our answer. One simple place that helps you get found on Google and AI search, shows you the
                people who are ready to buy, and gives you clean contacts so you can reach out. That is the whole idea,
                and it is what we work on every day.
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
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-4">What we believe</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Four simple ideas guide everything we build, so SYNQ stays easy to use and works for your business.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((v) => (
            <div key={v.title} className="glass-card p-6 rounded-2xl space-y-4 hover:bg-white/[0.04] transition-colors">
              <div className={`w-12 h-12 rounded-xl ${v.ring} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${v.color} text-2xl`}>{v.icon}</span>
              </div>
              <h3 className="font-headline-md text-xl text-on-surface">{v.title}</h3>
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
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-3">
              How SYNQ helps you
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-12">
              Get found, find ready buyers, and reach out to win. Everything we build helps with one of these three steps.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {PRINCIPLES.map((p) => (
                <div key={p.step}>
                  <p className="font-mono-data text-mono-data text-primary mb-3">{p.step}</p>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{p.title}</h3>
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
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-6">
            Ready to get found and get customers?
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10">
            Start today and let the right people find your business and reach out to you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/signup"
              className="btn-primary px-10 py-5 rounded-xl text-white font-bold text-xl hover:brightness-110 transition-all flex items-center gap-3"
            >
              Start free
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
