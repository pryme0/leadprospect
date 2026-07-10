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
              <span className="font-mono-label text-mono-label uppercase text-on-surface-variant">Now live across Africa</span>
            </div>
            <h1 className="font-display-xl text-display-xl text-white">
              Get found online. <span className="text-primary">Get more customers.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              SYNQ puts your business where buyers are searching, and shows you real people who are ready to buy what you sell — so you can reach out and win the sale.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/signup"
                className="btn-primary px-8 py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 transition-all flex items-center gap-2"
              >
                Start free
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
              <Link
                href="/features"
                className="glass-card px-8 py-4 rounded-xl text-white font-bold text-lg border border-glass-stroke hover:bg-white/10 transition-all"
              >
                See how it works
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
          <p className="font-mono-label text-mono-label text-center text-outline uppercase mb-8">Works with the tools you already use</p>
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
          <h2 className="font-display-lg text-display-lg mb-4">Everything you need to get found and get customers</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Two simple jobs, done for you: get your business discovered online, and connect you with people who are ready to buy.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-primary">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">travel_explore</span>
            </div>
            <h3 className="font-headline-md text-xl">Get found online</h3>
            <p className="text-sm text-on-surface-variant">Your business shows up on Google and AI search when buyers look for what you sell.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-tertiary">
            <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-xl">groups</span>
            </div>
            <h3 className="font-headline-md text-xl">Find ready buyers</h3>
            <p className="text-sm text-on-surface-variant">We spot people posting online that they want what you sell — before your competitors do.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-secondary">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-xl">contact_page</span>
            </div>
            <h3 className="font-headline-md text-xl">Their contact details</h3>
            <p className="text-sm text-on-surface-variant">We find each person's email and phone, so you can actually reach them.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-primary">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">forum</span>
            </div>
            <h3 className="font-headline-md text-xl">Reach out and win</h3>
            <p className="text-sm text-on-surface-variant">Message, follow up, and keep track of every deal — all in one simple place.</p>
          </div>
        </div>

        {/* iPad Landscape Showcase */}
        <div className="relative py-20 bg-surface-container-lowest/50 rounded-[3rem] border border-glass-stroke overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="relative z-10 px-8 flex flex-col items-center">
            <div className="text-center mb-12 max-w-2xl">
              <h2 className="font-display-lg text-3xl md:text-4xl mb-4">See it all in one simple place</h2>
              <p className="text-on-surface-variant">One clear view of the new customers coming in and the deals you're working on — nothing complicated.</p>
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
              <h2 className="font-display-xl text-display-xl text-white mb-6">Built for African businesses.</h2>
              <p className="font-body-lg text-body-lg text-white/80 mb-8 leading-relaxed">
                From one-person shops to growing teams, SYNQ helps you spend your time only on people who actually want to buy — no cold calling, no guessing.
              </p>
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-2 bg-white/10 rounded-full border border-white/20 px-4 py-2 text-mono-label text-white">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>No cold calling
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 rounded-full border border-white/20 px-4 py-2 text-mono-label text-white">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>Real buyers only
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-primary/5 -skew-y-3" />
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-10 text-center">
          <h2 className="font-display-lg text-display-lg text-white mb-6">Your next customer is already looking for you.</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-xl mx-auto">
            Let SYNQ find them and bring them to you — so you can focus on serving customers, not chasing them.
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <Link
              href="/signup"
              className="btn-primary px-12 py-5 rounded-xl text-white font-bold text-xl hover:brightness-110 transition-all flex items-center gap-3"
            >
              Start free
              <span className="material-symbols-outlined text-2xl">arrow_forward</span>
            </Link>
            <p className="font-mono-label text-mono-label text-outline">No card needed. Free for 14 days.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
