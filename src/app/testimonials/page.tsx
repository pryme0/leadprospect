import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Customer Stories & Testimonials',
  description:
    'See how revenue teams use SYNQ to orchestrate complex deal cycles, eliminate data silos, and route high-intent leads to the right rep faster.',
  path: '/testimonials',
});

export default function TestimonialsPage() {
  return (
    <main className="pt-32 pb-stack-lg">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-24">
        <div className="grid lg:grid-cols-2 gap-gutter items-center">
          <div className="space-y-stack-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-glass-stroke">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="font-mono-label text-mono-label text-tertiary uppercase">Proven Results</span>
            </div>
            <h1 className="font-display-xl text-display-xl tracking-tight">
              Built by <span className="gradient-text">Revenue Pioneers.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              See how world-class sales organizations use SYNQ to orchestrate complex deal cycles, eliminate data silos,
              and drive predictable growth.
            </p>
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="font-display-lg text-display-lg text-primary">300%</span>
                <span className="font-mono-label text-mono-label text-on-surface-variant uppercase">Pipeline Growth</span>
              </div>
              <div className="w-px h-12 bg-glass-stroke self-center"></div>
              <div className="flex flex-col">
                <span className="font-display-lg text-display-lg text-secondary">42%</span>
                <span className="font-mono-label text-mono-label text-on-surface-variant uppercase">Faster Closing</span>
              </div>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-container to-tertiary rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative rounded-xl overflow-hidden aspect-[1.49]">
              <img
                alt="Diverse revenue team collaborating"
                className="object-cover w-full h-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcgY5vLI6vCZ-3eQqgSLY5CAdf_1amEeDHegahkWbikJQ2OKBWFHMMPxaZteM-4Utjg0TT1k4x8QMlC9d9dkv2VEEy0DhO6XYJsVeYI0g8MLzK4HayWBceIxVwoM7owHqnV0BGKjP6DdBkOZjLKyeflNlvWCLfHklYqNu9_4UzrxrCZGkZj-SUJJpOJP99vOCdyUAOiGwEg4z6t3m_zPULNPyxN17lww4NRjT3O0aGe0PMJCQpuIIxN_1n8YyhvXp8dwGG5oKvf_XU"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 to-transparent flex items-end p-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden">
                    <img
                      className="w-full h-full object-cover"
                      alt="Sarah Chen, CRO at TechFlow"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuANekZe4hc8FbF52D0CC3t0zHk5gMfv2VWHDF25alLM8SBe8T3ZN22zsykbkOepHEq9DoMYVOkfSYeK0Em-rst0ezDfnA8O7ZAI8eBoj8k1wKG_CEswK2xlGBTZSKjzppHAjPxWMvq7w3tcfbEV3aQNHOTv27UvvxCKW6InyP7B_ibr1s4ZJwf3BtoS9eP_11a8qf1jd24zCYY4YJNTwIfL_x7YwOp_dWM2B7xw-O7MQfoou8g1ACC7GJbhMolNRWgeK6vwHNrKzaZd"
                    />
                  </div>
                  <div>
                    <p className="font-body-md text-on-primary-container font-bold">
                      &quot;SYNQ transformed our ops overnight.&quot;
                    </p>
                    <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">
                      Sarah Chen • CRO at TechFlow
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Testimonials */}
      <section className="max-w-container-max mx-auto px-margin-desktop space-y-gutter">
        <div className="flex flex-col md:flex-row justify-between items-end gap-gutter">
          <h2 className="font-display-lg text-display-lg">
            Trusted by the <span className="text-primary">Best.</span>
          </h2>
          <div className="flex gap-2">
            <button className="p-2 glass-card rounded-full hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="p-2 glass-card rounded-full hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Main Video Case Study */}
          <div className="md:col-span-8 glass-card rounded-xl p-8 flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
            <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <img
                className="w-full h-full object-cover"
                alt="High-tech control center with data visualizations"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB4JGA8UcpzdkD_CkJtHq8pNvMkFe9XalRjufZPWw52CYDz_zlL5pdy3NWP6jVOca2m6-E9w-Rz6Avnf_YgY1ww8QTzcAc86ZOYhAkQz_g22337peTJTylayIrMfiqg9yp0buzjqxBhl0I5AEqvNXtfD5Jml14WYgx8WWk0zY8E9rWSRP60stvwLlJ7ffHs4d5WLkYvdCBGJ7U96rvf8QZixHh8cT-jIYny3hlsUjSy0CKvGahRCzWRQJsTn-D4ckRSFHT4ZxZLEJX"
              />
            </div>
            <div className="relative z-10 flex justify-between items-start">
              <div className="bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30">
                <span className="font-mono-label text-mono-label uppercase">Featured Case Study</span>
              </div>
              <span className="material-symbols-outlined text-4xl text-primary animate-pulse">play_circle</span>
            </div>
            <div className="relative z-10 space-y-4">
              <h3 className="font-display-lg text-display-lg max-w-xl">
                How GlobalSaaS Unified 12 Regional Teams into One Hub
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="font-display-lg text-display-lg text-tertiary">85%</span>
                  <span className="font-mono-label text-mono-label text-on-surface-variant uppercase">Efficiency Gain</span>
                </div>
                <a className="inline-flex items-center gap-2 font-body-md text-primary hover:underline transition-all" href="#">
                  Watch Full Video <span className="material-symbols-outlined">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>

          {/* Small Quote Card */}
          <div className="md:col-span-4 glass-card rounded-xl p-8 flex flex-col justify-between border-l-4 border-l-secondary">
            <div className="space-y-4">
              <div className="flex gap-1 text-secondary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <p className="font-body-lg text-body-lg italic text-on-surface">
                &quot;The first platform that actually understands how sales engineers and AEs collaborate.&quot;
              </p>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-surface-container-high border border-glass-stroke"></div>
              <div>
                <p className="font-body-md font-bold text-on-surface">James Wilson</p>
                <p className="font-mono-label text-mono-label text-on-surface-variant">VP of Ops, Nexus</p>
              </div>
            </div>
          </div>

          {/* ROI Metric Card */}
          <div className="md:col-span-4 glass-card rounded-xl p-8 bg-gradient-to-br from-surface-container-low to-deep-obsidian">
            <div className="h-24 mb-6">
              {/* Tiny Sparkline SVG placeholder */}
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <path d="M0,35 L20,30 L40,32 L60,15 L80,18 L100,5" fill="none" stroke="#00e299" strokeWidth="2"></path>
                <path
                  d="M0,35 L20,30 L40,32 L60,15 L80,18 L100,5 L100,40 L0,40 Z"
                  fill="url(#grad)"
                  opacity="0.1"
                ></path>
                <defs>
                  <linearGradient id="grad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00e299', stopOpacity: 1 }}></stop>
                    <stop offset="100%" style={{ stopColor: '#00e299', stopOpacity: 0 }}></stop>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="font-mono-label text-mono-label text-tertiary uppercase mb-2">Platform Impact</p>
            <h4 className="font-display-lg text-display-lg mb-2">+$4.2M</h4>
            <p className="font-body-md text-on-surface-variant">
              Additional revenue identified by SYNQ&rsquo;s leak detection for ScaleAI.
            </p>
          </div>

          {/* Middle Grid Story */}
          <div className="md:col-span-5 glass-card rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
              <span className="material-symbols-outlined text-6xl">insights</span>
            </div>
            <div className="space-y-6 relative z-10">
              <p className="font-body-lg text-body-lg leading-relaxed">
                &quot;Before SYNQ, our revenue forecasting was a guessing game. Now, we have a literal command center that
                alerts us when a deal is stalling before the AE even knows.&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center font-bold">
                  MK
                </div>
                <div>
                  <p className="font-body-md font-bold">Marcus King</p>
                  <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">
                    Director of Revenue, Velocity
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Highlight */}
          <div className="md:col-span-3 glass-card rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest border border-glass-stroke flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">hub</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest border border-glass-stroke flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">analytics</span>
              </div>
            </div>
            <p className="font-body-md font-medium">Native Salesforce &amp; Slack Sync</p>
            <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">&quot;Seamless Adoption&quot;</p>
          </div>
        </div>
      </section>

      {/* Video Gallery */}
      <section className="max-w-container-max mx-auto px-margin-desktop py-24">
        <h2 className="font-display-lg text-display-lg mb-12">
          Inside the <span className="text-secondary">Workflow.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Video 1 */}
          <div className="space-y-4">
            <div className="aspect-video glass-card rounded-xl relative group cursor-pointer overflow-hidden">
              <img
                className="w-full h-full object-cover"
                alt="Revenue analytics dashboards on a modern computer screen"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwBQy1mPTD99OSes2kIMYu6uMXBYjsFE950a58vojrrwG6gL4ix-cTu1GG6OYVNkFy_pCTp2dOAIK6XTRHFaHY9iG6gJk90B9QwZ5dqBiy0OwCxpf0_qkfWstaTAe_mQ98b87EotGuEZchgh5qFC3f8knN8MA3P4UC4zpN1oxquZMcuxhJZ_4WW6BWG2GGITTdfnZeYQFRxIbDVpWX0zhIfXgypyEt3bvLXUVDmvpmpH7J1UVE6c1DBaTQvB3Q4qpZHrx6sSU44EE-"
              />
              <div className="absolute inset-0 bg-midnight/40 group-hover:bg-midnight/20 transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-white opacity-80 group-hover:scale-110 transition-transform">
                  play_arrow
                </span>
              </div>
            </div>
            <div>
              <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">Enterprise Onboarding</p>
              <h4 className="font-headline-md text-headline-md">Zero-Touch Setup</h4>
            </div>
          </div>
          {/* Video 2 */}
          <div className="space-y-4">
            <div className="aspect-video glass-card rounded-xl relative group cursor-pointer overflow-hidden">
              <img
                className="w-full h-full object-cover"
                alt="Diverse professionals in a glass-walled meeting room reviewing data"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD09gfye8yoV-E2wGkmCgt0tKgQXkKE2rBZ5N0tpCWZBOIyjWUGUJzQkM51bTV0OTV0YvQs6SKbuHWANeyy1V1dQRyX9z8bTVWXKCE8NqqlODOvfPv9wsqsOSXOkoMLXEeSkYMSxSEtx_yE5MbISBLIUMKWv3zCAhhBkoNnVqD-kdnEENXBQOA7JrQzK0nfbVEqo5ir_za3bKhCTsaQ5qxtY_usIeOjBdu5YTx57swrmPPM9UwBbmrRvJQCGYQETrripTL6y8P_SUWM"
              />
              <div className="absolute inset-0 bg-midnight/40 group-hover:bg-midnight/20 transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-white opacity-80 group-hover:scale-110 transition-transform">
                  play_arrow
                </span>
              </div>
            </div>
            <div>
              <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">User Spotlight</p>
              <h4 className="font-headline-md text-headline-md">The AE Command Center</h4>
            </div>
          </div>
          {/* Video 3 */}
          <div className="space-y-4">
            <div className="aspect-video glass-card rounded-xl relative group cursor-pointer overflow-hidden">
              <img
                className="w-full h-full object-cover"
                alt="Futuristic UI dashboard with glowing data points"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-bunB8sXfTB4My_EITFenuoX-hw8Cz9nJqu9z0dZt-7roK_3OrrDZFoqQOJdFep5Em75W6cQbOZJ-30T6CVH_2RnAU48_vOXG2vrXg_zjhBvp1X4tgBt0hEOKL60igrWcUVMBB9W_7kk-TKjtYvsvNqlBns-ixYGec-Fx7qSNDigJN67j7iIG-EykF2cNt-LJ4gmTlMwnsz9e_s-UTDTgR1Ot6ZUKUcuQVRZ97XkFh5az6VDhFSPkhhddtFPtqc_-Y6vA6Pl0ywN7"
              />
              <div className="absolute inset-0 bg-midnight/40 group-hover:bg-midnight/20 transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-white opacity-80 group-hover:scale-110 transition-transform">
                  play_arrow
                </span>
              </div>
            </div>
            <div>
              <p className="font-mono-label text-mono-label text-on-surface-variant uppercase">Executive Review</p>
              <h4 className="font-headline-md text-headline-md">Visualizing Forecasts</h4>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-container-max mx-auto px-margin-desktop py-24 text-center">
        <div className="glass-card rounded-2xl p-16 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          <div className="max-w-2xl mx-auto space-y-stack-md">
            <h2 className="font-display-lg text-display-lg">
              Ready to join the <span className="text-primary">next generation</span> of revenue?
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Join over 250+ enterprise teams who have scaled their revenue operations with SYNQ.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4 pt-4">
              <Link
                href="/signup"
                className="bg-primary-container text-on-primary-container px-8 py-4 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all"
              >
                Get a Demo
              </Link>
              <Link
                href="/testimonials"
                className="glass-card px-8 py-4 rounded-lg font-bold hover:bg-surface-variant active:scale-95 transition-all"
              >
                View Case Studies
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
