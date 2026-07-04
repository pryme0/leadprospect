import type { Metadata } from 'next';

/**
 * Single source of truth for SEO/GEO. Everything canonical (metadataBase,
 * canonical URLs, OG/Twitter, sitemap, robots, JSON-LD) derives from here.
 *
 * Set NEXT_PUBLIC_SITE_URL to the real production domain in the environment.
 * The fallback below is only used when the env var is missing (dev/preview).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.synq.com').replace(/\/$/, '');

export const SITE = {
  name: 'SYNQ',
  legalName: 'SYNQ Systems Inc.',
  url: SITE_URL,
  /** ~55-char default title (root uses a template of `%s | SYNQ`). */
  defaultTitle: 'SYNQ — Lead Intelligence Platform for Revenue Teams',
  /** ~155-char honest B2B description (no unverifiable ad-source / stat claims). */
  description:
    'SYNQ unifies cross-channel buying signals, AI intent scoring, deduplication, and automated lead routing into one revenue command center for B2B sales teams.',
  twitterHandle: '@synq',
  contactEmail: 'hello@synq.demo',
  locale: 'en_US',
  keywords: [
    'lead intelligence', 'sales intelligence platform', 'revenue intelligence',
    'intent-based lead routing', 'AI lead scoring', 'buying signals',
    'signal-based prospecting', 'lead deduplication', 'lead source attribution',
    'CRM enrichment', 'B2B lead generation', 'pipeline intelligence', 'SYNQ',
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
