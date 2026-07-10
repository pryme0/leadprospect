import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { itemListSchema, breadcrumbSchema, datasetSchema } from '@/lib/seo/schema';
import { getListings, getCategoryFacets } from '@/lib/hub/data';
import { getCategoryInsight } from '@/lib/hub/insights';
import { categoryBySlug, locationBySlug, categoryLabel, locationLabel } from '@/lib/hub/taxonomy';
import DemandInsight from '../../../DemandInsight';

export const revalidate = 3600;
export const dynamicParams = true;

const MIN_INDEXABLE = 3;

export async function generateStaticParams() {
  const { categoryLocations } = await getCategoryFacets().catch(() => ({ categoryLocations: [] as { category: string; location: string }[] }));
  return categoryLocations.map((cl) => ({ category: cl.category, location: cl.location }));
}

export async function generateMetadata({ params }: { params: { category: string; location: string } }): Promise<Metadata> {
  const cat = categoryBySlug(params.category);
  const loc = locationBySlug(params.location);
  if (!cat || !loc) return pageMetadata({ title: 'Not found', description: '', path: `/hub/c/${params.category}/${params.location}`, noindex: true });
  const listings = await getListings({ category: params.category, location: params.location }).catch(() => []);
  return pageMetadata({
    title: `${cat.label} in ${loc.label} — directory & what people want`,
    description: `Find ${cat.label.toLowerCase()} businesses in ${loc.label} on the SYNQ Hub, ranked by real interest. See what people in ${loc.label} are looking for.`,
    path: `/hub/c/${cat.slug}/${loc.slug}`,
    keywords: [`${cat.label} in ${loc.label}`, `best ${cat.label.toLowerCase()} ${loc.label}`, `${loc.label} business directory`],
    noindex: listings.length < MIN_INDEXABLE,
  });
}

export default async function CategoryLocationPage({ params }: { params: { category: string; location: string } }) {
  const cat = categoryBySlug(params.category);
  const loc = locationBySlug(params.location);
  if (!cat || !loc) notFound();
  const listings = await getListings({ category: params.category, location: params.location });
  if (listings.length === 0) notFound();

  const insight = await getCategoryInsight(listings.map((l) => l.orgId));

  const schema = [
    itemListSchema({ name: `${cat.label} in ${loc.label}`, path: `/hub/c/${cat.slug}/${loc.slug}`, items: listings.map((l) => ({ slug: l.slug, companyName: l.companyName })) }),
    breadcrumbSchema([
      { name: 'Hub', path: '/hub' },
      { name: cat.label, path: `/hub/c/${cat.slug}` },
      { name: loc.label, path: `/hub/c/${cat.slug}/${loc.slug}` },
    ]),
    ...(insight.available
      ? [datasetSchema({ name: `What people want from ${cat.label} in ${loc.label}`, description: `Based on what people are searching for around ${cat.label.toLowerCase()} businesses in ${loc.label}, gathered by SYNQ.`, path: `/hub/c/${cat.slug}/${loc.slug}`, keywords: insight.painPoints })]
      : []),
  ];

  return (
    <main className="pt-32 pb-stack-lg">
      <JsonLd data={schema} />
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <nav className="mb-8 text-mono-label text-on-surface-variant flex items-center gap-2">
          <Link href="/hub" className="hover:text-primary">Hub</Link><span>/</span>
          <Link href={`/hub/c/${cat.slug}`} className="hover:text-primary">{cat.label}</Link><span>/</span>
          <span className="text-on-surface">{loc.label}</span>
        </nav>

        <section className="max-w-3xl mb-12">
          <h1 className="font-display-xl text-on-surface mb-4">{cat.label} in <span className="text-primary">{loc.label}</span></h1>
          <p className="text-body-lg text-on-surface-variant">
            {listings.length} {cat.label.toLowerCase()} {listings.length === 1 ? 'business' : 'businesses'} in {loc.label}, ranked by real interest.
          </p>
        </section>

        <div className="mb-12">
          <DemandInsight insight={insight} title={`What people in ${loc.label} want`} subtitle={`Based on what people are searching for around ${cat.label.toLowerCase()} in ${loc.label}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {listings.map((l) => (
            <Link key={l.slug} href={`/hub/${l.slug}`} className="glass-card rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors group">
              <div className="flex items-center gap-4">
                {l.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover border border-glass-stroke bg-surface-container" />
                ) : (
                  <div className="h-12 w-12 rounded-xl border border-glass-stroke bg-surface-container flex items-center justify-center text-headline-md text-primary">{l.companyName.charAt(0)}</div>
                )}
                <div className="min-w-0">
                  <p className="text-body-lg text-on-surface font-semibold truncate group-hover:text-primary transition-colors">{l.companyName}</p>
                  <p className="text-mono-label text-on-surface-variant">{categoryLabel(l.category)} · {locationLabel(l.location)}</p>
                </div>
              </div>
              {l.about && <p className="text-body-md text-on-surface-variant line-clamp-2">{l.about}</p>}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
