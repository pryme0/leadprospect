import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/config';
import { getListingSlugs, getCategoryFacets } from '@/lib/hub/data';

/**
 * Public routes only. Excludes /admin, /api, and post-conversion /thank-you.
 * Async so the SYNQ Hub (per-business + category pages) can be enumerated from
 * the database. Hub queries degrade gracefully so a DB hiccup never breaks the
 * static sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
    { path: '/',             changeFrequency: 'weekly',  priority: 1.0 },
    { path: '/features',     changeFrequency: 'monthly', priority: 0.9 },
    { path: '/pricing',      changeFrequency: 'monthly', priority: 0.9 },
    { path: '/integrations', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/hub',          changeFrequency: 'daily',   priority: 0.9 },
    { path: '/testimonials', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/signup',       changeFrequency: 'yearly',  priority: 0.7 },
    { path: '/privacy',      changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = routes.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // SYNQ Hub — per-business profiles (premium ranked higher) + category facets.
  const [listings, facets] = await Promise.all([
    getListingSlugs().catch(() => []),
    getCategoryFacets().catch(() => ({ categories: [], categoryLocations: [] })),
  ]);

  for (const l of listings) {
    entries.push({ url: absoluteUrl(`/hub/${l.slug}`), lastModified: new Date(l.updatedAt || now), changeFrequency: 'weekly', priority: l.premium ? 0.8 : 0.6 });
  }
  for (const c of facets.categories) {
    entries.push({ url: absoluteUrl(`/hub/c/${c.category}`), lastModified: now, changeFrequency: 'weekly', priority: 0.7 });
  }
  for (const cl of facets.categoryLocations) {
    entries.push({ url: absoluteUrl(`/hub/c/${cl.category}/${cl.location}`), lastModified: now, changeFrequency: 'weekly', priority: 0.6 });
  }

  return entries;
}
