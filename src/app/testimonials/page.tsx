import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Customer Stories',
  description:
    'SYNQ is new and building its first customer stories. Real reviews from growing businesses are coming soon.',
  path: '/testimonials',
});

export default function TestimonialsPage() {
  return (
    <main className="pt-32 pb-stack-lg">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-margin-desktop mb-24">
        <div className="max-w-2xl space-y-stack-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-glass-stroke">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-mono-label text-mono-label text-tertiary uppercase">Real reviews coming soon</span>
          </div>
          <h1 className="font-display-xl text-display-xl tracking-tight">
            Loved by <span className="gradient-text">growing businesses</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
            SYNQ is new. We are just getting started and building our first customer stories. As soon as business
            owners share how SYNQ helped them get found and get customers, you will read their words right here.
          </p>
        </div>
      </section>

      {/* Honest message + trust points */}
      <section className="max-w-container-max mx-auto px-margin-desktop space-y-gutter">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          <div className="md:col-span-8 glass-card rounded-xl p-8 md:p-10 space-y-4">
            <h2 className="font-display-lg text-display-lg">
              We would rather be <span className="text-primary">honest</span> than fake it
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              A lot of new tools put made-up reviews on their page. We will not do that. When we show you a story, it
              will be from a real business owner who used SYNQ to get found on Google and AI search and connect with
              people ready to buy.
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Want to be one of our first stories? Start free today and tell us how it goes. We would love to share
              your win.
            </p>
          </div>

          <div className="md:col-span-4 glass-card rounded-xl p-8 space-y-6">
            <p className="font-mono-label text-mono-label text-tertiary uppercase">Why business owners try SYNQ</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">search</span>
                <span className="font-body-md text-on-surface">Get found on Google and AI search</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary">group</span>
                <span className="font-body-md text-on-surface">Reach people who are ready to buy</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary">contact_page</span>
                <span className="font-body-md text-on-surface">Get clean, usable contacts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">public</span>
                <span className="font-body-md text-on-surface">Built for businesses in Africa</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-container-max mx-auto px-margin-desktop py-24 text-center">
        <div className="glass-card rounded-2xl p-16 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          <div className="max-w-2xl mx-auto space-y-stack-md">
            <h2 className="font-display-lg text-display-lg">
              Ready to <span className="text-primary">get found</span> and get customers?
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Start today and let the right people find your business and reach out to you.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4 pt-4">
              <Link
                href="/signup"
                className="bg-primary-container text-on-primary-container px-8 py-4 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="glass-card px-8 py-4 rounded-lg font-bold hover:bg-surface-variant active:scale-95 transition-all"
              >
                See plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
