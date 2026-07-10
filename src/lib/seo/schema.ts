import { SITE, SITE_URL, absoluteUrl } from './config';
import { PLAN_TIERS, TIER_DEFS, TIER_PRICING, fmtUSD } from '@/lib/subscription/tiers';

/**
 * JSON-LD builders. Kept honest: no fabricated aggregateRating / review counts.
 * Rendered via <JsonLd> (src/components/JsonLd.tsx).
 */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE_URL,
    logo: absoluteUrl('/icon-512.png'),
    description: SITE.description,
    email: SITE.contactEmail,
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: SITE.contactEmail,
      availableLanguage: ['English'],
    }],
  };
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE.name,
    url: SITE_URL,
    description: SITE.description,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-US',
  };
}

/**
 * SoftwareApplication for the product. `offers` reflect the real Basic/Pro/Max
 * tiers (src/lib/subscription/tiers.ts — the single source of truth shared by
 * the pricing page and the in-app billing page); no rating is asserted.
 */
export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Sales Intelligence',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: SITE.description,
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: PLAN_TIERS.map((tier) => ({
      '@type': 'Offer',
      name: TIER_DEFS[tier].name,
      price: fmtUSD(TIER_PRICING[tier].usd),
      priceCurrency: 'USD',
      category: 'subscription',
    })),
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/**
 * A SYNQ Hub business listing. `@type: Organization` (a directory listing, not a
 * claim of physical premises) with `areaServed` + `knowsAbout` for topical/GEO
 * signal. No aggregateRating — same honesty policy as the rest of this file.
 */
export function localBusinessSchema(listing: {
  slug: string;
  companyName: string;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  categoryLabel?: string | null;
  locationLabel?: string | null;
  knowsAbout?: string[];
}) {
  const profileUrl = absoluteUrl(`/hub/${listing.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${profileUrl}#business`,
    name: listing.companyName,
    url: profileUrl,
    ...(listing.website ? { sameAs: [listing.website] } : {}),
    ...(listing.logoUrl ? { logo: listing.logoUrl, image: listing.logoUrl } : {}),
    ...(listing.description ? { description: listing.description } : {}),
    ...(listing.locationLabel ? { areaServed: listing.locationLabel } : {}),
    ...(listing.categoryLabel || listing.knowsAbout?.length
      ? { knowsAbout: [listing.categoryLabel, ...(listing.knowsAbout ?? [])].filter(Boolean) }
      : {}),
    subjectOf: { '@type': 'WebPage', url: profileUrl },
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}

/** ItemList / CollectionPage for the directory index and category pages. */
export function itemListSchema(input: {
  name: string;
  path: string;
  items: { slug: string; companyName: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: absoluteUrl(input.path),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.items.length,
      itemListElement: input.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absoluteUrl(`/hub/${it.slug}`),
        name: it.companyName,
      })),
    },
  };
}

/**
 * Dataset schema for a demand-insight block — makes SYNQ's aggregated buyer-intent
 * data machine-readable and citable by AI engines. Honest framing: it is described
 * as aggregated & anonymized signal data collected by SYNQ.
 */
export function datasetSchema(input: { name: string; description: string; path: string; keywords?: string[] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    creator: { '@id': `${SITE_URL}/#organization` },
    ...(input.keywords?.length ? { keywords: input.keywords.join(', ') } : {}),
    isAccessibleForFree: true,
  };
}

export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}
