import Link from 'next/link';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { softwareApplicationSchema } from '@/lib/seo/schema';

const HOME_TITLE = 'SYNQ — Lead Intelligence Platform for Revenue Teams';
export const metadata: Metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description:
      'Unify cross-channel buying signals, AI intent scoring, and automated lead routing in one revenue command center — so your team works the right accounts first.',
    path: '/',
  }),
  // Home is the brand root — no "| SYNQ" suffix from the template.
  title: { absolute: HOME_TITLE },
};

export default function HomePage() {
  return (
    <main className="relative">
      <JsonLd data={softwareApplicationSchema()} />
      <div className="hero-glow -top-40 -left-20" />
      <div className="hero-glow top-1/4 -right-20" />

      {/* Hero Section */}
      <section className="pt-48 pb-32 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="grid lg:grid-cols-2 gap-stack-lg items-center">
          <div className="space-y-stack-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-glass-stroke">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span className="font-mono-label text-mono-label uppercase text-on-surface-variant">V2.4 Intelligence Engine Live</span>
            </div>
            <h1 className="font-display-xl text-display-xl text-white">
              The Command Center for Modern <span className="text-primary">Revenue Teams.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              Synthesize your pipeline, automate outbound precision, and dominate your market with technical intelligence that scales.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/signup"
                className="btn-primary px-8 py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 transition-all flex items-center gap-2"
              >
                Start free trial
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
              <Link
                href="/signup"
                className="glass-card px-8 py-4 rounded-xl text-white font-bold text-lg border border-glass-stroke hover:bg-white/10 transition-all"
              >
                Book demo
              </Link>
            </div>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-container/20 to-secondary-container/20 rounded-full blur-3xl" />
            {/* iPhone Mockup */}
            <div className="glass-card rounded-[2.5rem] p-2 shadow-2xl max-w-[320px] scale-90 md:scale-100">
              <img
                alt="SYNQ Mobile App Activity Feed"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsxbb_5toLFkMB8no2RIW8vMk0RtLOhAkiwovVI_-ApuidLuZU3OcxhRGGhQm8gb5I3B9riCcs4R0f_NX_E1316mD9aREVaDUhLdHHBIS73atoBQvO8K4531CEm959SdlyQ5Jq6vxDiWrJC6bqZsJf3fLT6TUlgEDv6wI1AT11_lp9J-ZEjfbERQL92eNSmQe6T34T1p7G-Ct__eXDuwksxAmaCk9NEhVm-4y-UtNYxVLCOmFuZEMGUOtnBRJ0B5MHyCcKuzgizZ9l"
                className="w-full h-full object-cover rounded-[2rem]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Integration Bar */}
      <section className="py-12 border-y border-glass-stroke bg-midnight/30">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <p className="font-mono-label text-mono-label text-center text-outline uppercase mb-8">Integrated with the Modern Stack</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60">
            <span className="font-headline-md text-headline-md font-bold tracking-tight integration-logo cursor-pointer">LinkedIn</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tight integration-logo cursor-pointer">HubSpot</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tight integration-logo cursor-pointer">Salesforce</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tight integration-logo cursor-pointer">Slack</span>
            <span className="font-headline-md text-headline-md font-bold tracking-tight integration-logo cursor-pointer">Zapier</span>
          </div>
        </div>
      </section>

      {/* Full Suite Capabilities */}
      <section className="py-stack-lg px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="font-display-lg text-display-lg mb-4">Precision Engineering for Modern Sales</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Stop guessing where your next deal is coming from. Our engine processes millions of data points to deliver actionable intent signals across four core pillars.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-primary">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">sensors</span>
            </div>
            <h3 className="font-headline-md text-xl">Lead Intelligence</h3>
            <p className="text-sm text-on-surface-variant">Aggregates cross-platform activities and social mentions into a high-fidelity feed.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-tertiary">
            <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-xl">route</span>
            </div>
            <h3 className="font-headline-md text-xl">Automated Routing</h3>
            <p className="text-sm text-on-surface-variant">Intelligent lead distribution based on dynamic ICP matching and representative load.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-secondary">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-xl">chat</span>
            </div>
            <h3 className="font-headline-md text-xl">Comm Hub</h3>
            <p className="text-sm text-on-surface-variant">Unified communication layer for seamless outreach across Email, Slack, and LinkedIn.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-primary">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">sync_alt</span>
            </div>
            <h3 className="font-headline-md text-xl">Seamless CRM Sync</h3>
            <p className="text-sm text-on-surface-variant">Real-time bi-directional synchronization with Salesforce, HubSpot, and MS Dynamics.</p>
          </div>
        </div>

        {/* iPad Landscape Showcase */}
        <div className="relative py-20 bg-surface-container-lowest/50 rounded-[3rem] border border-glass-stroke overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="relative z-10 px-8 flex flex-col items-center">
            <div className="text-center mb-12 max-w-2xl">
              <h2 className="font-display-lg text-3xl md:text-4xl mb-4">Deep Dashboard Intelligence</h2>
              <p className="text-on-surface-variant">Get the full picture with our high-fidelity iPad interface, designed for deep dives into pipeline health and intent scoring.</p>
            </div>
            <div className="glass-card rounded-[2.5rem] p-2 shadow-2xl max-w-4xl w-full">
              <div className="relative">
                <img
                  alt="SYNQ iPad Dashboard"
                  className="object-cover w-full rounded-[2rem]"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-UlZcHwXsUXMlNOT-6h0Th2nhpxqSvFSKEn9f7alL9i1EPAIqVybcg6Y6x5Tp86CjLhDu6hAQwN2WQQw-T6XDk-NBlwLwZ4-Zyeahf8k67IkTl080Wb08WabTO_VcJCEyPD8e104ilJuZyVVWCFl5R2kc2mTe_cPPcSw9LfnFcn3OXTpC6cT4tP7iv5hH8_AnQmW5YEeN5ZlG7mmTTE_4kkeJA9Qs-y4hcL-ZUgtfbRYg9S7EowFsAF5c60Zr5sa_LuP4EXqXtW65"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-[2rem]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Impact Visual Section */}
      <section className="py-stack-lg relative overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="relative rounded-[2rem] overflow-hidden aspect-[21/9] flex items-center border border-glass-stroke">
            <div className="absolute inset-0 z-0">
              <img
                alt="Revenue team collaborating in modern office"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida/AP1WRLtshIRiKNxFzteFK1mjt2gKqVpa_U4M3GILxDRd60igy8ejVeJA-BrkgqhKNwxk4t-UerRHOsISX3goExlAYAW1sUsj8PCX8s-V346fY-zIg2qLilk7domw4f2o4gh-Np3ltCDK0LD20jvpJIl0KmFAJO_IeHbJ59_RkHJEUgfN5Xd_n5kQ7BbU_jYZfoQVFrbvGG45HAxaFYgbzjluJR3JG67Wl3pqhJfsqTGDTIrHpTSiuORi57r4VYo"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-midnight via-midnight/60 to-transparent" />
            </div>
            <div className="relative z-10 p-stack-lg max-w-2xl">
              <h2 className="font-display-xl text-display-xl text-white mb-6">Built for the Boardroom.</h2>
              <p className="font-body-lg text-body-lg text-white/80 mb-8 leading-relaxed">
                From seed-stage startups to global enterprises, SYNQ provides the data-rich visibility that executive teams demand to forecast with 99% accuracy.
              </p>
              <div className="flex gap-12">
                <div>
                  <p className="text-4xl font-bold text-primary">312%</p>
                  <p className="font-mono-label text-mono-label text-white/60">AVG PIPELINE GROWTH</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-tertiary">14d</p>
                  <p className="font-mono-label text-mono-label text-white/60">REDUCED SALES CYCLE</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-primary/5 -skew-y-3" />
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-10 text-center">
          <h2 className="font-display-lg text-display-lg text-white mb-6">Your next deal is already in your feed.</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-xl mx-auto">
            Stop manually searching for signals. Let SYNQ automate the hard work of revenue intelligence.
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <Link
              href="/signup"
              className="btn-primary px-12 py-5 rounded-xl text-white font-bold text-xl hover:brightness-110 transition-all flex items-center gap-3"
            >
              Create workspace
              <span className="material-symbols-outlined text-2xl">add_circle</span>
            </Link>
            <p className="font-mono-label text-mono-label text-outline">No credit card required. Free 14-day trial.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
