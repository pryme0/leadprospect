import { appPool, ensureAppSchema } from '@/lib/app-pg';

/**
 * Server-side company/org profile, keyed to the logged-in user. Stored in the
 * SHARED Postgres (not per-environment SQLite) so a user's company name, logo,
 * analysis and brand terms are identical across local and prod. Async because
 * Postgres is.
 */
export interface OrgProfile {
  company_name: string;
  website: string;
  contact_email: string;
  timezone: string;
  logo_url: string;
  industry: string;
  about: string;
  services: string;
  expectations: string;
}

export interface OrgProfileRecord extends OrgProfile {
  user_id: string;
  crawler_sbu_id: string | null;
  analysis: WebsiteAnalysis | null;
  analyzed_at: string | null;
  /** Brand-monitoring terms used to fetch mentions across the web. */
  brand_keywords: string[];
  brand_handles: string[];
  exclude_terms: string[];
  mentions_analyzed_at: string | null;
  updated_at: string;
}

/** Shape produced by the website analyzer and stored on the profile. */
export interface WebsiteAnalysis {
  summary: string;
  target_audience: string;
  pain_points: string[];
  keywords: string[];
  /** Short, topical/hashtag-style terms for TikTok search (consumer phrasing). */
  keywords_tiktok?: string[];
  /** Short, topical/hashtag-style terms for Instagram search. */
  keywords_instagram?: string[];
}

/** Brand-monitoring terms derived from the company profile/website. */
export interface BrandTerms {
  brand_keywords: string[];
  brand_handles: string[];
  exclude_terms: string[];
}

const EMPTY: OrgProfile = {
  company_name: '',
  website: '',
  contact_email: '',
  timezone: 'America/New_York',
  logo_url: '',
  industry: '',
  about: '',
  services: '',
  expectations: '',
};

interface Row {
  user_id: string;
  company_name: string | null;
  website: string | null;
  contact_email: string | null;
  timezone: string | null;
  logo_url: string | null;
  industry: string | null;
  about: string | null;
  services: string | null;
  expectations: string | null;
  crawler_sbu_id: string | null;
  analysis_json: string | null;
  analyzed_at: string | null;
  brand_keywords: string | null;
  brand_handles: string | null;
  exclude_terms: string | null;
  mentions_analyzed_at: string | null;
  updated_at: string;
}

function parseArray(raw: string | null): string[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; }
  catch { return []; }
}

function rowToRecord(row: Row): OrgProfileRecord {
  let analysis: WebsiteAnalysis | null = null;
  if (row.analysis_json) {
    try { analysis = JSON.parse(row.analysis_json) as WebsiteAnalysis; } catch { analysis = null; }
  }
  return {
    user_id: row.user_id,
    company_name: row.company_name ?? '',
    website: row.website ?? '',
    contact_email: row.contact_email ?? '',
    timezone: row.timezone ?? EMPTY.timezone,
    logo_url: row.logo_url ?? '',
    industry: row.industry ?? '',
    about: row.about ?? '',
    services: row.services ?? '',
    expectations: row.expectations ?? '',
    crawler_sbu_id: row.crawler_sbu_id,
    analysis,
    analyzed_at: row.analyzed_at,
    brand_keywords: parseArray(row.brand_keywords),
    brand_handles: parseArray(row.brand_handles),
    exclude_terms: parseArray(row.exclude_terms),
    mentions_analyzed_at: row.mentions_analyzed_at,
    updated_at: row.updated_at,
  };
}

export async function getOrgProfile(userId: string): Promise<OrgProfileRecord | null> {
  await ensureAppSchema();
  const { rows } = await appPool().query('SELECT * FROM org_profiles WHERE user_id = $1', [userId]);
  return rows[0] ? rowToRecord(rows[0] as Row) : null;
}

/** Insert or replace the editable profile fields, preserving crawler/analysis columns. */
export async function upsertOrgProfile(userId: string, data: Partial<OrgProfile>): Promise<OrgProfileRecord> {
  await ensureAppSchema();
  const existing = await getOrgProfile(userId);
  const merged: OrgProfile = { ...EMPTY, ...(existing ?? {}), ...data };
  const now = new Date().toISOString();

  await appPool().query(
    `INSERT INTO org_profiles (
       user_id, company_name, website, contact_email, timezone, logo_url,
       industry, about, services, expectations, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (user_id) DO UPDATE SET
       company_name  = excluded.company_name,
       website       = excluded.website,
       contact_email = excluded.contact_email,
       timezone      = excluded.timezone,
       logo_url      = excluded.logo_url,
       industry      = excluded.industry,
       about         = excluded.about,
       services      = excluded.services,
       expectations  = excluded.expectations,
       updated_at    = excluded.updated_at`,
    [userId, merged.company_name, merged.website, merged.contact_email, merged.timezone, merged.logo_url,
     merged.industry, merged.about, merged.services, merged.expectations, now],
  );

  return (await getOrgProfile(userId))!;
}

/** Store brand-monitoring terms (from analyzeBrand or manual settings edit). */
export async function setBrandTerms(userId: string, terms: Partial<BrandTerms>, markAnalyzed = false): Promise<OrgProfileRecord> {
  await ensureAppSchema();
  const now = new Date().toISOString();
  if (!(await getOrgProfile(userId))) await upsertOrgProfile(userId, {});
  const clean = (arr?: string[]) => JSON.stringify(
    Array.from(new Set((arr ?? []).map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 120))).slice(0, 50),
  );
  const existing = (await getOrgProfile(userId))!;
  await appPool().query(
    `UPDATE org_profiles
     SET brand_keywords = $1, brand_handles = $2, exclude_terms = $3,
         mentions_analyzed_at = $4, updated_at = $5
     WHERE user_id = $6`,
    [
      clean(terms.brand_keywords ?? existing.brand_keywords),
      clean(terms.brand_handles ?? existing.brand_handles),
      clean(terms.exclude_terms ?? existing.exclude_terms),
      markAnalyzed ? now : existing.mentions_analyzed_at,
      now,
      userId,
    ],
  );
  return (await getOrgProfile(userId))!;
}

/** True when the user has at least one brand term to monitor. */
export function hasBrandTerms(profile: OrgProfileRecord | null): boolean {
  if (!profile) return false;
  return profile.brand_keywords.length > 0 || profile.brand_handles.length > 0;
}

/** Store the crawler SBU id + website analysis after /api/leads/generate runs. */
export async function setOrgAnalysis(userId: string, sbuId: string, analysis: WebsiteAnalysis): Promise<void> {
  await ensureAppSchema();
  const now = new Date().toISOString();
  // Ensure a row exists first (a user could generate before ever saving).
  if (!(await getOrgProfile(userId))) await upsertOrgProfile(userId, {});
  await appPool().query(
    `UPDATE org_profiles
     SET crawler_sbu_id = $1, analysis_json = $2, analyzed_at = $3, updated_at = $4
     WHERE user_id = $5`,
    [sbuId, JSON.stringify(analysis), now, now, userId],
  );
}
