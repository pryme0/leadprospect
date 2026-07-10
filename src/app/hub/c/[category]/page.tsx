import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { itemListSchema, breadcrumbSchema, datasetSchema } from '@/lib/seo/schema';
import { getListings, getCategoryFacets } from '@/lib/hub/data';
import { getCategoryInsight } from '@/lib/hub/insights';
import { categoryBySlug, categoryLabel, locationLabel } from '@/lib/hub/taxonomy';
import DemandInsight from '../../DemandInsight';

export const revalidate = 3600;
export const dynamicParams = true;

const MIN_INDEXABLE = 3; // fewer listings → render but don't index (anti-thin-page)

export async function generateStaticParams() {
  const { categories } = await getCategoryFacets().catch(() => ({ categories: [] as { category: string }[] }));
  return categories.map((c) => ({ category: c.category }));
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const cat = categoryBySlug(params.category);
  if (!cat) return pageMetadata({ title: 'Category not found', description: '', path: `/hub/c/${params.category}`, noindex: true });
  const listings = await getListings({ category: params.category }).catch(() => []);
  return pageMetadata({
    title: `${cat.label} businesses in Africa — directory & what people want`,
    description: `Discover ${listings.length}+ ${cat.label.toLowerCase()} businesses across Africa on the SYNQ Hub, ranked by real interest. See what people are searching for.`,
    path: `/hub/c/${cat.slug}`,
    keywords: [`${cat.label} in Africa`, `${cat.label} companies`, `best ${cat.label.toLowerCase()}`, 'African business directory'],
    noindex: listings.length < MIN_INDEXABLE,
  });
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const cat = categoryBySlug(params.category);
  if (!cat) notFound();
  const listings = await getListings({ category: params.category });
  if (listings.length === 0) notFound();

  const insight = await getCategoryInsight(listings.map((l) => l.orgId));

  const schema = [
    itemListSchema({ name: `${cat.label} businesses`, path: `/hub/c/${cat.slug}`, items: listings.map((l) => ({ slug: l.slug, companyName: l.companyName })) }),
    breadcrumbSchema([{ name: 'Hub', path: '/hub' }, { name: cat.label, path: `/hub/c/${cat.slug}` }]),
    ...(insight.available
      ? [datasetSchema({ name: `What people want in ${cat.label} (Africa)`, description: `Based on what people are searching for across ${cat.label.toLowerCase()} businesses in Africa, gathered by SYNQ.`, path: `/hub/c/${cat.slug}`, keywords: insight.painPoints })]
      : []),
  ];

  return (
    <main className="pt-32 pb-stack-lg">
      <JsonLd data={schema} />
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <nav className="mb-8 text-mono-label text-on-surface-variant flex items-center gap-2">
          <Link href="/hub" className="hover:text-primary">Hub</Link><span>/</span><span className="text-on-surface">{cat.label}</span>
        </nav>

        <section className="max-w-3xl mb-12">
          <h1 className="font-display-xl text-on-surface mb-4">{cat.label} in <span className="text-primary">Africa</span></h1>
          <p className="text-body-lg text-on-surface-variant">
            {listings.length} {cat.label.toLowerCase()} {listings.length === 1 ? 'business' : 'businesses'} on the SYNQ Hub, ranked by real interest.
          </p>
        </section>

        <div className="mb-12">
          <DemandInsight insight={insight} title={`What people in ${cat.label.toLowerCase()} want`} subtitle="Based on what people in this category are searching for" />
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
