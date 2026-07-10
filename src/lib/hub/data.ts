/**
 * SYNQ Hub — public read queries. Everything here is safe to render on the
 * PUBLIC directory: it only ever selects business-descriptive columns from
 * org_profiles (never lead PII, which lives in the separate signals DB). Only
 * opted-in businesses (`hub_listed = true`) are returned.
 */
import { appPool, ensureAppSchema } from '@/lib/app-pg';
import type { WebsiteAnalysis } from '@/lib/settings/org-store';

export interface HubListing {
  /** Org id (owner user id) — used to map to the crawler SBU for demand insights. */
  orgId: string;
  slug: string;
  companyName: string;
  website: string | null;
  logoUrl: string | null;
  industry: string | null;
  about: string | null;
  services: string | null;
  category: string | null;
  location: string | null;
  premium: boolean;
  verified: boolean;
  /** Business-market analysis (target audience, pain points) — NOT lead data. */
  analysis: WebsiteAnalysis | null;
  updatedAt: string;
}

interface ListingRow {
  user_id: string;
  hub_slug: string;
  company_name: string | null;
  website: string | null;
  logo_url: string | null;
  industry: string | null;
  about: string | null;
  services: string | null;
  hub_category: string | null;
  hub_location: string | null;
  hub_premium: boolean | null;
  hub_verified_at: string | null;
  analysis_json: string | null;
  updated_at: string;
}

const LISTING_COLS = `
  user_id, hub_slug, company_name, website, logo_url, industry, about, services,
  hub_category, hub_location, hub_premium, hub_verified_at, analysis_json, updated_at
`;

function rowToListing(row: ListingRow): HubListing {
  let analysis: WebsiteAnalysis | null = null;
  if (row.analysis_json) {
    try { analysis = JSON.parse(row.analysis_json) as WebsiteAnalysis; } catch { analysis = null; }
  }
  return {
    orgId: row.user_id,
    slug: row.hub_slug,
    companyName: row.company_name ?? 'Business',
    website: row.website || null,
    logoUrl: row.logo_url || null,
    industry: row.industry || null,
    about: row.about || null,
    services: row.services || null,
    category: row.hub_category,
    location: row.hub_location,
    premium: row.hub_premium ?? false,
    verified: !!row.hub_verified_at,
    analysis,
    updatedAt: row.updated_at,
  };
}

/** Base WHERE for a publicly visible listing: opted in and has a slug. */
const LISTED = `hub_listed = true AND hub_slug IS NOT NULL AND hub_slug <> ''`;

/** All publicly listed businesses (premium first, then most recently updated). */
export async function getListings(filter?: { category?: string; location?: string }): Promise<HubListing[]> {
  await ensureAppSchema();
  const clauses = [LISTED];
  const params: unknown[] = [];
  if (filter?.category) { params.push(filter.category); clauses.push(`hub_category = $${params.length}`); }
  if (filter?.location) { params.push(filter.location); clauses.push(`hub_location = $${params.length}`); }
  const { rows } = await appPool().query(
    `SELECT ${LISTING_COLS} FROM org_profiles
     WHERE ${clauses.join(' AND ')}
     ORDER BY hub_premium DESC, updated_at DESC`,
    params,
  );
  return (rows as ListingRow[]).map(rowToListing);
}

/** One listing by slug, or null (unlisted / unknown). */
export async function getListingBySlug(slug: string): Promise<HubListing | null> {
  await ensureAppSchema();
  const { rows } = await appPool().query(
    `SELECT ${LISTING_COLS} FROM org_profiles WHERE hub_slug = $1 AND ${LISTED} LIMIT 1`,
    [slug],
  );
  return rows[0] ? rowToListing(rows[0] as ListingRow) : null;
}

/** Just the slugs of listings to prerender/enumerate (sitemap + generateStaticParams). */
export async function getListingSlugs(opts: { premiumOnly?: boolean } = {}): Promise<{ slug: string; updatedAt: string; premium: boolean }[]> {
  await ensureAppSchema();
  const extra = opts.premiumOnly ? 'AND hub_premium = true' : '';
  const { rows } = await appPool().query(
    `SELECT hub_slug, updated_at, hub_premium FROM org_profiles WHERE ${LISTED} ${extra} ORDER BY updated_at DESC`,
  );
  return (rows as { hub_slug: string; updated_at: string; hub_premium: boolean | null }[])
    .map((r) => ({ slug: r.hub_slug, updatedAt: r.updated_at, premium: r.hub_premium ?? false }));
}

/**
 * Category (and category×location) pairs that clear the minimum-listings gate
 * (default 3) — the anti-thin-page guardrail for programmatic pages + sitemap.
 */
export async function getCategoryFacets(minCount = 3): Promise<{
  categories: { category: string; count: number }[];
  categoryLocations: { category: string; location: string; count: number }[];
}> {
  await ensureAppSchema();
  const cat = await appPool().query(
    `SELECT hub_category AS category, COUNT(*)::int AS count FROM org_profiles
     WHERE ${LISTED} AND hub_category IS NOT NULL
     GROUP BY hub_category HAVING COUNT(*) >= $1 ORDER BY count DESC`,
    [minCount],
  );
  const catLoc = await appPool().query(
    `SELECT hub_category AS category, hub_location AS location, COUNT(*)::int AS count FROM org_profiles
     WHERE ${LISTED} AND hub_category IS NOT NULL AND hub_location IS NOT NULL
     GROUP BY hub_category, hub_location HAVING COUNT(*) >= $1 ORDER BY count DESC`,
    [minCount],
  );
  return {
    categories: cat.rows as { category: string; count: number }[],
    categoryLocations: catLoc.rows as { category: string; location: string; count: number }[],
  };
}

/** Category slugs that have at least one listing (for the directory filter chips). */
export async function getActiveCategoryCounts(): Promise<Record<string, number>> {
  await ensureAppSchema();
  const { rows } = await appPool().query(
    `SELECT hub_category AS category, COUNT(*)::int AS count FROM org_profiles
     WHERE ${LISTED} AND hub_category IS NOT NULL GROUP BY hub_category`,
  );
  const out: Record<string, number> = {};
  for (const r of rows as { category: string; count: number }[]) out[r.category] = r.count;
  return out;
}
