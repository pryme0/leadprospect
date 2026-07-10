import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { localBusinessSchema, breadcrumbSchema, faqSchema, datasetSchema } from '@/lib/seo/schema';
import { getListingBySlug, getListingSlugs, type HubListing } from '@/lib/hub/data';
import { categoryLabel, locationLabel } from '@/lib/hub/taxonomy';
import { getListingInsight } from '@/lib/hub/insights';
import DemandInsight from '../DemandInsight';

/** Refresh listing content daily; render unknown/non-premium slugs on demand. */
export const revalidate = 86400;
export const dynamicParams = true;

/** Prerender only premium listings at build; the rest are ISR on first hit. */
export async function generateStaticParams() {
  const slugs = await getListingSlugs({ premiumOnly: true }).catch(() => []);
  return slugs.map((s) => ({ slug: s.slug }));
}

/** True when a listing has enough content to be worth indexing. */
function isThin(l: HubListing): boolean {
  return !l.about && !l.analysis?.summary && !l.services;
}

function metaDescription(l: HubListing): string {
  const base = l.analysis?.summary || l.about || l.services || `${l.companyName} on the SYNQ Hub.`;
  const where = l.location ? ` Serving ${locationLabel(l.location)}.` : '';
  return `${base}${where}`.slice(0, 155);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const listing = await getListingBySlug(params.slug).catch(() => null);
  if (!listing) return pageMetadata({ title: 'Business not found', description: 'This listing is not available.', path: `/hub/${params.slug}`, noindex: true });
  const cat = categoryLabel(listing.category);
  return pageMetadata({
    title: `${listing.companyName} — ${cat} in ${locationLabel(listing.location)}`,
    description: metaDescription(listing),
    path: `/hub/${listing.slug}`,
    keywords: [listing.companyName, cat, locationLabel(listing.location), ...(listing.analysis?.keywords ?? []).slice(0, 6)],
    noindex: isThin(listing),
  });
}

function buildFaq(l: HubListing): { q: string; a: string }[] {
  const items: { q: string; a: string }[] = [];
  const what = l.services || l.about || l.analysis?.summary;
  if (what) items.push({ q: `What does ${l.companyName} do?`, a: what });
  if (l.analysis?.target_audience) items.push({ q: `Who does ${l.companyName} serve?`, a: l.analysis.target_audience });
  const pains = (l.analysis?.pain_points ?? []).slice(0, 4);
  if (pains.length) items.push({ q: `What problems does ${l.companyName} solve?`, a: pains.join('; ') });
  return items;
}

export default async function HubProfilePage({ params }: { params: { slug: string } }) {
  const listing = await getListingBySlug(params.slug);
  if (!listing) notFound();

  const catLabel = categoryLabel(listing.category);
  const locLabel = locationLabel(listing.location);
  const faq = buildFaq(listing);
  const painPoints = (listing.analysis?.pain_points ?? []).slice(0, 6);
  // Free listings get a nofollow outbound link; premium earns do-follow.
  const linkRel = listing.premium ? 'noopener' : 'nofollow noopener';

  // Live, anonymized demand insight from SYNQ's signals (the USP). Suppressed
  // (available:false) below the k-anonymity threshold or if the signals DB is down.
  const insight = await getListingInsight(listing.orgId);

  const schema = [
    localBusinessSchema({
      slug: listing.slug,
      companyName: listing.companyName,
      website: listing.website,
      logoUrl: listing.logoUrl,
      description: listing.analysis?.summary || listing.about,
      categoryLabel: catLabel,
      locationLabel: locLabel,
      knowsAbout: (listing.analysis?.keywords ?? []).slice(0, 8),
    }),
    breadcrumbSchema([
      { name: 'Hub', path: '/hub' },
      { name: catLabel, path: `/hub/c/${listing.category ?? 'other'}` },
      { name: listing.companyName, path: `/hub/${listing.slug}` },
    ]),
    ...(faq.length ? [faqSchema(faq)] : []),
    ...(insight.available
      ? [datasetSchema({
          name: `What people want from ${listing.companyName}`,
          description: `Based on what people are searching for around ${listing.companyName} (${catLabel}, ${locLabel}), gathered by SYNQ.`,
          path: `/hub/${listing.slug}`,
          keywords: insight.painPoints,
        })]
      : []),
  ];

  return (
    <main className="pt-32 pb-stack-lg">
      <JsonLd data={schema} />
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        {/* Breadcrumb */}
        <nav className="mb-8 text-mono-label text-on-surface-variant flex items-center gap-2">
          <Link href="/hub" className="hover:text-primary">Hub</Link>
          <span>/</span>
          <Link href={`/hub/c/${listing.category ?? 'other'}`} className="hover:text-primary">{catLabel}</Link>
        </nav>

        {/* Hero */}
        <section className="glass-card rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-8">
          <div className="shrink-0">
            {listing.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.logoUrl} alt={`${listing.companyName} logo`} className="h-24 w-24 rounded-2xl object-cover border border-glass-stroke bg-surface-container" />
            ) : (
              <div className="h-24 w-24 rounded-2xl border border-glass-stroke bg-surface-container flex items-center justify-center text-display-lg text-primary">
                {listing.companyName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-surface-container rounded-full border border-glass-stroke px-3 py-1 text-mono-label text-on-surface-variant">
                {catLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-surface-container rounded-full border border-glass-stroke px-3 py-1 text-mono-label text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">location_on</span>{locLabel}
              </span>
              {listing.verified && (
                <span className="inline-flex items-center gap-1.5 bg-primary-container/20 rounded-full border border-primary/40 px-3 py-1 text-mono-label text-primary">
                  <span className="material-symbols-outlined text-[14px]">verified</span>Verified
                </span>
              )}
            </div>
            <h1 className="font-display-lg text-on-surface mb-3">{listing.companyName}</h1>
            {(listing.analysis?.summary || listing.about) && (
              <p className="text-body-lg text-on-surface-variant max-w-2xl">{listing.analysis?.summary || listing.about}</p>
            )}
            {listing.website && (
              <a href={listing.website} target="_blank" rel={linkRel} className="btn-primary mt-6 inline-flex items-center gap-2">
                Visit website<span className="material-symbols-outlined text-[18px]">arrow_outward</span>
              </a>
            )}
          </div>
        </section>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-8">
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* USP: live, anonymized interest signals (renders nothing if suppressed). */}
            <DemandInsight
              insight={insight}
              title={`What people want from ${listing.companyName} right now`}
              subtitle="What people are searching for right now — from SYNQ"
            />
            {listing.about && (
              <section className="glass-card rounded-2xl p-8">
                <h2 className="font-headline-md text-on-surface mb-4">About {listing.companyName}</h2>
                <p className="text-body-md text-on-surface-variant whitespace-pre-line">{listing.about}</p>
              </section>
            )}
            {listing.services && (
              <section className="glass-card rounded-2xl p-8">
                <h2 className="font-headline-md text-on-surface mb-4">What they offer</h2>
                <p className="text-body-md text-on-surface-variant whitespace-pre-line">{listing.services}</p>
              </section>
            )}
            {/* Fallback market context when live insight isn't available yet. */}
            {!insight.available && painPoints.length > 0 && (
              <section className="glass-card rounded-2xl p-8">
                <h2 className="font-headline-md text-on-surface mb-2">What people in {catLabel.toLowerCase()} are looking for</h2>
                <p className="text-mono-label text-on-surface-variant mb-4">What people in this market want</p>
                <ul className="flex flex-col gap-3">
                  {painPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 text-body-md text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">bolt</span>{p}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="glass-card rounded-2xl p-6">
              <p className="text-mono-label text-on-surface-variant mb-3">Details</p>
              <dl className="flex flex-col gap-3 text-body-md">
                <div className="flex justify-between gap-4"><dt className="text-on-surface-variant">Category</dt><dd className="text-on-surface text-right">{catLabel}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-on-surface-variant">Serves</dt><dd className="text-on-surface text-right">{locLabel}</dd></div>
                {listing.industry && <div className="flex justify-between gap-4"><dt className="text-on-surface-variant">Industry</dt><dd className="text-on-surface text-right">{listing.industry}</dd></div>}
              </dl>
            </div>
            {!listing.premium && (
              <div className="glass-card rounded-2xl p-6">
                <p className="text-body-md text-on-surface mb-1 font-semibold">Is this your business?</p>
                <p className="text-body-md text-on-surface-variant mb-4">Claim this profile to verify it, show what people want, and reach customers already looking for you.</p>
                <Link href={`/signup?claim=${listing.slug}`} className="btn-primary w-full text-center">Claim this profile</Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
