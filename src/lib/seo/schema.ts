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
