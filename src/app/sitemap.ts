import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/config';

/**
 * Public routes only. Excludes /admin, /api, and post-conversion /thank-you.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
    { path: '/',             changeFrequency: 'weekly',  priority: 1.0 },
    { path: '/features',     changeFrequency: 'monthly', priority: 0.9 },
    { path: '/pricing',      changeFrequency: 'monthly', priority: 0.9 },
    { path: '/integrations', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/testimonials', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/signup',       changeFrequency: 'yearly',  priority: 0.7 },
    { path: '/privacy',      changeFrequency: 'yearly',  priority: 0.3 },
  ];

  return routes.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
