import type { Metadata } from 'next';

/**
 * Single source of truth for SEO/GEO. Everything canonical (metadataBase,
 * canonical URLs, OG/Twitter, sitemap, robots, JSON-LD) derives from here.
 *
 * Set NEXT_PUBLIC_SITE_URL to the real production domain in the environment.
 * The fallback below is used when the env var is missing OR empty — deploy
 * containers often set it to '' rather than leaving it undefined, and an empty
 * value would make `new URL(SITE_URL)` (metadataBase in the root layout) throw
 * during the build. `|| ` (not `??`) treats '' as absent so the build is safe.
 */
const DEFAULT_SITE_URL = 'https://www.synq.com';
function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (!raw) return DEFAULT_SITE_URL;
  try { new URL(raw); return raw; } catch { return DEFAULT_SITE_URL; } // reject values without a scheme etc.
}
export const SITE_URL = resolveSiteUrl();

export const SITE = {
  name: 'SYNQ',
  legalName: 'SYNQ Systems Inc.',
  url: SITE_URL,
  /** Plain-language default title (root uses a template of `%s | SYNQ`). */
  defaultTitle: 'SYNQ — Get Your Business Found Online & Find New Customers',
  /** ~155-char honest description in everyday words (no jargon, no unverifiable stats). */
  description:
    'SYNQ helps your business get found on Google and AI search, and connects you with people already looking to buy what you sell — so you can reach out and win.',
  twitterHandle: '@synq',
  contactEmail: 'hello@synq.demo',
  locale: 'en_US',
  keywords: [
    'get my business found on Google', 'find customers online', 'how to get more customers',
    'get found on AI search', 'online business directory Africa', 'find people ready to buy',
    'get customers for my business', 'grow my business online', 'Nigeria business directory', 'SYNQ',
  ],
} as const;

/** Absolute URL for a path (canonical / OG). */
export function absoluteUrl(path = '/'): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

interface PageMetaInput {
  title: string;
  description: string;
  /** Route path, e.g. '/pricing'. Used for the canonical + OG url. */
  path: string;
  keywords?: string[];
  /** Post-conversion / private pages that should not be indexed. */
  noindex?: boolean;
}

/**
 * DRY builder for per-page metadata — fills canonical, Open Graph and Twitter
 * from the page's title/description/path. Titles are passed WITHOUT the brand
 * suffix; the root `%s | SYNQ` template appends it.
 */
export function pageMetadata({ title, description, path, keywords, noindex }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    ...(keywords?.length ? { keywords: [...keywords] } : {}),
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'website',
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
