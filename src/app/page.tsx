import Link from 'next/link';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { softwareApplicationSchema } from '@/lib/seo/schema';

const HOME_TITLE = 'SYNQ — Get Your Business Found Online & Find New Customers';
export const metadata: Metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description:
      'SYNQ helps your business get found on Google and AI search, and connects you with people already looking to buy what you sell — so you can reach out and win.',
    path: '/',
  }),
  title: { absolute: HOME_TITLE },
};

/* Design tokens (Velocity Systems light theme, from Stitch) */
const NAVY = '#0a1128';       // headlines + dark sections (primary-container)
const PURPLE = '#6f2ce3';     // secondary accent
const SURFACE = '#f7f9fb';    // page background
const INK = '#191c1e';        // on-surface
const MUTED = '#46464d';      // on-surface-variant
const LIGHT_INK = '#eceef0';  // light text on navy

const NAV_LINKS = [
  { label: 'Hub', href: '/hub' },
  { label: 'Features', href: '/features' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

const FEATURES = [
  { icon: 'travel_explore', tile: '#eaddff', ink: PURPLE, title: 'Get found online', body: 'Your business shows up on Google and AI search when buyers look for what you sell.' },
  { icon: 'groups', tile: '#dce1ff', ink: NAVY, title: 'Find ready buyers', body: 'We spot people posting online that they want what you sell — before your competitors do.' },
  { icon: 'contact_page', tile: '#d9e2ff', ink: '#00429a', title: 'Their contact details', body: "We find each person's email and phone, so you can actually reach them." },
  { icon: 'forum', tile: '#f0e9ff', ink: PURPLE, title: 'Reach out and win', body: 'Message, follow up, and keep track of every deal — all in one simple place.' },
];

export default function HomePage() {
  return (
    <div style={{ backgroundColor: SURFACE, color: INK, fontFamily: 'var(--font-inter)' }} className="min-h-screen overflow-x-hidden">
      <JsonLd data={softwareApplicationSchema()} />
      <style>{`
        @keyframes synq-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .synq-float { animation: synq-float 6s ease-in-out infinite; }
        .synq-grad { background: linear-gradient(135deg, #6f2ce3 0%, #884dfd 100%); }
        .synq-tilt { transform: rotateY(-8deg) rotateX(4deg); transition: transform .6s ease; }
        .synq-tilt:hover { transform: rotateY(0) rotateX(0); }
        .synq-glass { background: rgba(255,255,255,.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.4); }
        .synq-head { font-family: var(--font-sora), system-ui, sans-serif; letter-spacing: -0.03em; }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 h-20 border-b" style={{ backgroundColor: 'rgba(247,249,251,.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(198,198,206,.35)' }}>
        <div className="flex justify-between items-center max-w-[1280px] mx-auto px-6 h-full">
          <Link href="/" className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/synq-logo.png" alt="SYNQ" className="h-9 w-8 object-cover object-left" />
            <span className="synq-head text-2xl font-extrabold" style={{ color: NAVY }}>SYNQ</span>
          </Link>
          <nav className="hidden md:flex gap-8 items-center text-[15px] font-medium">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:opacity-100" style={{ color: MUTED }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/admin/login" className="hidden md:block font-medium transition-colors" style={{ color: MUTED }}>Login</Link>
            <Link href="/signup" className="synq-grad text-white px-6 py-2.5 rounded-lg font-semibold active:scale-95 transition-transform">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36" style={{ backgroundColor: SURFACE }}>
          <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: '#dce1ff', color: '#141a32', fontFamily: 'var(--font-jetbrains)' }}>
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
                NOW LIVE ACROSS AFRICA
              </div>
              <h1 className="synq-head text-[40px] md:text-[64px] font-extrabold leading-[1.05] mb-6" style={{ color: NAVY }}>
                Get found online.<br />
                <span style={{ color: PURPLE }}>Get more customers.</span>
              </h1>
              <p className="text-lg mb-9 max-w-xl" style={{ color: MUTED }}>
                SYNQ puts your business where buyers are searching, and shows you real people who are ready to buy what you sell — so you can reach out and win the sale.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/signup" className="synq-grad text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 group shadow-lg">
                  Start free
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                </Link>
                <Link href="/features" className="px-8 py-4 rounded-xl font-bold border transition-colors" style={{ borderColor: NAVY, color: NAVY }}>
                  See how it works
                </Link>
              </div>
              <p className="mt-4 text-xs" style={{ color: '#76767e', fontFamily: 'var(--font-jetbrains)' }}>No card needed. Free for 14 days.</p>
            </div>
            <div className="relative mt-8 lg:mt-0">
              <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(234,221,255,.5)' }} />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(220,225,255,.5)' }} />
              <div className="relative synq-glass rounded-2xl p-4 lg:rotate-2 hover:rotate-0 transition-transform duration-500 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="SYNQ live activity — new customers ready to buy" className="rounded-xl w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdPlf1sv4oQhlN3u2Ux-Hu0wskzGbAOw64lTIKVgGWqrbm1OqoDLreNrM9N5gBm38_8H4Z8qPSCzkX6HB6HsyJeUaOmyRFjXrkitbYFJQM48NlUVjOi_MIP7FFIfFHvAJpRS1X9O5UNMzcrKcQ5SJLGKtdcYHCkY053Ve3BwVtS8l6ki9c3MMimorGcjZTFXV1Lx4Y1zOd2GfrE_2zvXo9_r33BysG1TkUU24qeugU-VDeHUNtRT1X2Q" />
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="py-14 border-y" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(198,198,206,.25)' }}>
          <div className="max-w-[1280px] mx-auto px-6">
            <p className="text-center text-xs uppercase tracking-widest mb-9" style={{ color: '#76767e', fontFamily: 'var(--font-jetbrains)' }}>Works with the tools you already use</p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-60">
              {['LinkedIn', 'HubSpot', 'Salesforce', 'Slack', 'Zapier'].map((n) => (
                <span key={n} className="synq-head text-xl font-bold" style={{ color: NAVY }}>{n}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 md:py-32" style={{ backgroundColor: SURFACE }}>
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="max-w-3xl mb-16">
              <h2 className="synq-head text-[32px] md:text-[48px] font-bold mb-5 leading-tight" style={{ color: NAVY }}>Everything you need to get found and get customers</h2>
              <p className="text-lg" style={{ color: MUTED }}>Two simple jobs, done for you: get your business discovered online, and connect you with people who are ready to buy.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="group p-8 rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(198,198,206,.2)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: f.tile, color: f.ink }}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  </div>
                  <h3 className="synq-head text-xl font-bold mb-3" style={{ color: NAVY }}>{f.title}</h3>
                  <p style={{ color: MUTED }}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard preview (dark) */}
        <section className="py-24 md:py-32 overflow-hidden" style={{ backgroundColor: NAVY, color: '#ffffff' }}>
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/3">
                <h2 className="synq-head text-[32px] md:text-[44px] font-bold mb-5 leading-tight">See it all in one simple place</h2>
                <p className="text-lg mb-8" style={{ color: LIGHT_INK }}>One clear view of the new customers coming in and the deals you&apos;re working on — nothing complicated.</p>
                <div className="space-y-4">
                  {[{ icon: 'monitoring', label: 'Real-time performance metrics' }, { icon: 'hub', label: 'Everything in one place' }].map((c) => (
                    <div key={c.label} className="flex items-center gap-4 p-4 rounded-xl transition-colors" style={{ backgroundColor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#b0c6ff' }}>{c.icon}</span>
                      <span className="font-medium">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-2/3" style={{ perspective: '1000px' }}>
                <div className="relative synq-float">
                  <div className="absolute -inset-10 blur-[100px] rounded-full" style={{ backgroundColor: 'rgba(111,44,227,.25)' }} />
                  <div className="relative synq-tilt rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,.2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="SYNQ dashboard — your customers and deals at a glance" className="w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsKyB974H7M5p-QbBuZryLG5nuo-3Kj42GTk3Vn4GhzK82XQ4GxC3HQvc8J-l4DFCUYvLOkxmviYy8uLQPFVI1my-_SW8Ixc9bNDorrsEIwrdrgGGBTzLQRB1T8GVzphfYEkx1aGrNX4mIb47TO1tTnLDyMTQJesZfa9xzRAr9mlynz7wFnmPZm6Omn0nl1QOK3V0Fj9Nngt_Y5Gr8aXoztuLUx2v7du_vgI3K6j0CW3Nb_itMGW6kKc4atBokF2EJ9i4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Built for Africa */}
        <section className="py-24 md:py-32" style={{ backgroundColor: '#ffffff' }}>
          <div className="max-w-[1280px] mx-auto px-6 text-center">
            <h2 className="synq-head text-[32px] md:text-[48px] font-bold mb-6" style={{ color: NAVY }}>Built for African businesses.</h2>
            <p className="max-w-2xl mx-auto text-lg mb-12" style={{ color: MUTED }}>
              From one-person shops to growing teams, SYNQ helps you spend your time only on people who actually want to buy — no cold calling, no guessing.
            </p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
              {['No cold calling', 'Real buyers only'].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-4xl" style={{ color: PURPLE, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="synq-head text-2xl font-bold" style={{ color: NAVY }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-24 md:pb-32 px-6">
          <div className="max-w-[1280px] mx-auto rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden" style={{ backgroundColor: NAVY }}>
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[120px]" style={{ backgroundColor: 'rgba(111,44,227,.35)' }} />
            <div className="relative z-10">
              <h2 className="synq-head text-[32px] md:text-[60px] font-extrabold text-white mb-6 leading-[1.05]">
                Your next customer is<br className="hidden md:block" /> already looking for you.
              </h2>
              <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: LIGHT_INK }}>
                Let SYNQ find them and bring them to you — so you can focus on serving customers, not chasing them.
              </p>
              <Link href="/signup" className="synq-grad inline-block text-white px-12 py-5 rounded-2xl font-extrabold text-lg active:scale-95 transition-all shadow-xl">
                Start free now
              </Link>
              <p className="mt-6 text-xs" style={{ color: LIGHT_INK, fontFamily: 'var(--font-jetbrains)' }}>No card needed. Setup takes 2 minutes.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-14" style={{ backgroundColor: SURFACE, borderColor: 'rgba(198,198,206,.4)' }}>
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex flex-col gap-4 max-w-xs">
              <div className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/synq-logo.png" alt="SYNQ" className="h-8 w-7 object-cover object-left" />
                <span className="synq-head text-xl font-extrabold" style={{ color: NAVY }}>SYNQ</span>
              </div>
              <p style={{ color: MUTED }}>Helping businesses get found online and win more customers. Simple, honest, built for Africa.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
              <FooterCol title="Product" links={[['Hub', '/hub'], ['Features', '/features'], ['Integrations', '/integrations'], ['Pricing', '/pricing']]} />
              <FooterCol title="Company" links={[['About', '/about'], ['Contact', '/contact']]} />
              <FooterCol title="Legal" links={[['Privacy', '/privacy'], ['Terms', '/terms']]} />
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: 'rgba(198,198,206,.3)' }}>
            <p style={{ color: MUTED }}>© 2026 SYNQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-bold" style={{ color: NAVY }}>{title}</span>
      <ul className="flex flex-col gap-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition-colors hover:underline" style={{ color: MUTED }}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
