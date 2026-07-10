'use client';

import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <main className="pt-32 pb-stack-lg">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-stack-lg">
        <div className="flex flex-col lg:flex-row gap-stack-lg items-center">
          <div className="w-full lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-glass-stroke mb-6">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span className="font-mono-label text-mono-label text-tertiary uppercase">How it works</span>
            </div>
            <h1 className="font-display-xl text-display-lg-mobile md:text-display-xl text-on-background mb-6">
              How SYNQ gets you <span className="text-primary">customers.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-xl">
              Three simple steps: get found online, find people ready to buy, then reach out and win the sale. SYNQ does the hard part for you.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl font-body-md font-bold hover:brightness-110 active:scale-95 transition-all glow-primary"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="glass-card text-on-background px-8 py-4 rounded-xl font-body-md font-bold hover:bg-surface-variant transition-all"
              >
                See plans
              </Link>
            </div>
          </div>
          {/* Hero Visual */}
          <div className="w-full lg:w-1/2 relative">
            <div className="relative rounded-2xl overflow-hidden glass-card glow-primary p-2">
              <img
                alt="SYNQ Dashboard Interface"
                className="w-full h-auto rounded-xl shadow-2xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH5FSaQOeqy4Six6wNOcH4V1CRQb5eil6hTuxaW5ciIIWB4WEkgA8nrAhmJGpPwyS48f3DQnR-utAo1BmS4WjuPfP1SvkBiPRi_j6sGNO3AA_euAiEptBELOWtlYDfINRpRuJhRy0L4dL35Okw9m6qBM7Tpw-xzjmSyW68oJA3oVL67RmRab1EDp-tl-PXUUD3MtjabLjCnyYtEBwANuJPH7TSq_MECI_jDfiiJcKa2MgSUDx174O8cN0L0QuYS1Ff6B--P8bpzgTV"
              />
            </div>
            {/* Decorative Elements */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive: Bento Grid */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Lead Intelligence Card */}
          <div className="md:col-span-7 glass-card p-8 rounded-2xl relative overflow-hidden group">
            <div className="flex flex-col h-full">
              <div className="mb-8">
                <span className="material-symbols-outlined text-secondary text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                <h2 className="font-headline-md text-headline-md mb-2">Get found & spot buyers</h2>
                <p className="text-on-surface-variant max-w-md">SYNQ helps your business show up online, and watches public posts to find people who are asking for exactly what you sell.</p>
              </div>
              <div className="mt-auto space-y-4">
                <div className="flex items-center gap-4 p-4 bg-surface-dim rounded-xl border border-glass-stroke">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary">travel_explore</span>
                  </div>
                  <div>
                    <div className="font-mono-data text-mono-data text-secondary">GET FOUND</div>
                    <div className="text-on-surface">Show up on Google and AI search when buyers look</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-surface-dim rounded-xl border border-glass-stroke">
                  <div className="w-10 h-10 rounded-lg bg-tertiary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary">groups</span>
                  </div>
                  <div>
                    <div className="font-mono-data text-mono-data text-tertiary">READY BUYERS</div>
                    <div className="text-on-surface">Find people already asking to buy what you sell</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Small Feature: CRM Sync */}
          <div className="md:col-span-5 glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 glow-primary">
              <span className="material-symbols-outlined text-primary text-5xl">sync</span>
            </div>
            <h3 className="font-headline-md text-headline-md mb-3">Works with your tools</h3>
            <p className="text-on-surface-variant mb-6">SYNQ connects to the customer list and tools you already use, so nothing has to be typed in twice.</p>
            <div className="flex gap-4 opacity-60">
              <span className="material-symbols-outlined text-3xl">cloud_sync</span>
              <span className="material-symbols-outlined text-3xl">hub</span>
              <span className="material-symbols-outlined text-3xl">database</span>
            </div>
          </div>

          {/* Automated Routing Card */}
          <div className="md:col-span-5 glass-card p-8 rounded-2xl overflow-hidden relative min-h-[400px]">
            <div className="relative z-10">
              <span className="material-symbols-outlined text-tertiary text-4xl mb-4">route</span>
              <h2 className="font-headline-md text-headline-md mb-2">Send the right customer to the right person</h2>
              <p className="text-on-surface-variant">If you have a team, SYNQ passes each new customer to the right person automatically — so nobody is missed.</p>
              <div className="mt-8 space-y-3">
                <div className="flex justify-between items-center bg-deep-obsidian p-3 rounded-lg border border-glass-stroke">
                  <span className="font-mono-data text-on-surface">New customer</span>
                  <span className="px-2 py-0.5 bg-tertiary/20 text-tertiary text-xs rounded">Sales team</span>
                </div>
                <div className="flex justify-between items-center bg-deep-obsidian p-3 rounded-lg border border-glass-stroke">
                  <span className="font-mono-data text-on-surface">Repeat buyer</span>
                  <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-xs rounded">Account manager</span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 p-4">
              <div className="w-32 h-32 bg-tertiary/10 blur-[60px] rounded-full"></div>
            </div>
          </div>

          {/* Comm Hub Card */}
          <div className="md:col-span-7 glass-card p-8 rounded-2xl flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2">
              <span className="material-symbols-outlined text-primary text-4xl mb-4">hub</span>
              <h2 className="font-headline-md text-headline-md mb-2">All your messages in one place</h2>
              <p className="text-on-surface-variant mb-6">Email, WhatsApp, and social messages all land in one inbox, so you never lose track of a conversation.</p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span className="text-on-surface">One inbox for every channel</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span className="text-on-surface">Your whole team can see and help</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span className="text-on-surface">Suggested replies to save you time</span>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2 bg-deep-obsidian rounded-xl p-4 border border-glass-stroke self-center">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-variant"></div>
                  <div className="flex-1 bg-surface-container p-3 rounded-tr-xl rounded-b-xl text-sm">
                    Hi! I saw you're looking for a new home — can you help?
                  </div>
                </div>
                <div className="flex items-start gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-primary-container"></div>
                  <div className="flex-1 bg-primary-container/20 p-3 rounded-tl-xl rounded-b-xl text-sm text-right border border-primary/20">
                    Absolutely. Does Thursday work?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Teaser */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="glass-card rounded-[2rem] p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-6">See how SYNQ works for a business like yours</h2>
            <p className="text-on-surface-variant text-body-lg max-w-2xl mx-auto mb-10">
              Start free today, or take a quick look at our plans. Getting set up takes just a few minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-secondary-container text-on-secondary-container px-10 py-5 rounded-2xl font-body-md font-bold hover:brightness-110 active:scale-95 transition-all glow-cyan text-deep-obsidian"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="bg-surface-bright text-on-surface px-10 py-5 rounded-2xl font-body-md font-bold hover:bg-surface-variant transition-all border border-glass-stroke"
              >
                See plans
              </Link>
            </div>
          </div>
          {/* Background ambient light */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-primary/5 via-secondary/5 to-tertiary/5"></div>
        </div>
      </section>
    </main>
  );
}
