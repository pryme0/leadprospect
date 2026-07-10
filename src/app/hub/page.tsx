import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { itemListSchema } from '@/lib/seo/schema';
import { getListings } from '@/lib/hub/data';
import HubDirectory, { type DirectoryItem } from './HubDirectory';

/** Directory index refreshes hourly. */
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: 'SYNQ Hub — Discover African businesses buyers are already looking for',
  description:
    'The SYNQ Hub is a directory of African businesses, ranked by real interest. Find trusted companies across fintech, real estate, logistics, health and more — and get discovered by AI search.',
  path: '/hub',
  keywords: ['African business directory', 'find businesses in Africa', 'Nigeria business directory', 'SYNQ Hub', 'what people want', 'B2B directory Africa'],
});

export default async function HubIndexPage() {
  const listings = await getListings().catch(() => []);
  const items: DirectoryItem[] = listings.map((l) => ({
    slug: l.slug,
    companyName: l.companyName,
    logoUrl: l.logoUrl,
    about: l.about,
    category: l.category,
    location: l.location,
    premium: l.premium,
    verified: l.verified,
  }));

  return (
    <main className="pt-32 pb-stack-lg">
      <JsonLd data={itemListSchema({ name: 'SYNQ Hub', path: '/hub', items })} />
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 bg-surface-container rounded-full border border-glass-stroke px-4 py-1.5 text-mono-label text-on-surface-variant mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary animate-pulse" />SYNQ Hub
          </span>
          <h1 className="font-display-xl text-on-surface mb-5">
            The businesses buyers are <span className="text-primary">already looking for</span>
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            A directory of African businesses, ranked by real interest — not ads. Find trusted
            companies, and get found on Google and AI search.
          </p>
        </section>

        {listings.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center max-w-xl mx-auto">
            <p className="text-body-lg text-on-surface mb-2 font-semibold">The Hub is just getting started.</p>
            <p className="text-body-md text-on-surface-variant">Businesses are being added now. Check back soon — or list yours to be among the first.</p>
          </div>
        ) : (
          <HubDirectory listings={items} />
        )}
      </div>
    </main>
  );
}
