import { getAuthDb } from '@/lib/auth/db';

/**
 * Server-side company/org profile, keyed to the logged-in user. This replaces
 * the browser-only `synq_org_profile` localStorage blob for anything the server
 * needs (website analysis, per-user lead scoping).
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

export function getOrgProfile(userId: string): OrgProfileRecord | null {
  const db = getAuthDb();
  const row = db.prepare('SELECT * FROM org_profiles WHERE user_id = ?').get(userId) as Row | undefined;
  return row ? rowToRecord(row) : null;
}

/** Insert or replace the editable profile fields, preserving crawler/analysis columns. */
export function upsertOrgProfile(userId: string, data: Partial<OrgProfile>): OrgProfileRecord {
  const db = getAuthDb();
  const existing = getOrgProfile(userId);
  const merged: OrgProfile = { ...EMPTY, ...(existing ?? {}), ...data };
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO org_profiles (
      user_id, company_name, website, contact_email, timezone, logo_url,
      industry, about, services, expectations, updated_at
    ) VALUES (
      @user_id, @company_name, @website, @contact_email, @timezone, @logo_url,
      @industry, @about, @services, @expectations, @updated_at
    )
    ON CONFLICT(user_id) DO UPDATE SET
      company_name  = excluded.company_name,
      website       = excluded.website,
      contact_email = excluded.contact_email,
      timezone      = excluded.timezone,
      logo_url      = excluded.logo_url,
      industry      = excluded.industry,
      about         = excluded.about,
      services      = excluded.services,
      expectations  = excluded.expectations,
      updated_at    = excluded.updated_at
  `).run({ user_id: userId, ...merged, updated_at: now });

  return getOrgProfile(userId)!;
}

/** Store brand-monitoring terms (from analyzeBrand or manual settings edit). */
export function setBrandTerms(userId: string, terms: Partial<BrandTerms>, markAnalyzed = false): OrgProfileRecord {
  const db = getAuthDb();
  const now = new Date().toISOString();
  if (!getOrgProfile(userId)) upsertOrgProfile(userId, {});
  const clean = (arr?: string[]) => JSON.stringify(
    Array.from(new Set((arr ?? []).map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 120))).slice(0, 50),
  );
  const existing = getOrgProfile(userId)!;
  db.prepare(`
    UPDATE org_profiles
    SET brand_keywords = ?, brand_handles = ?, exclude_terms = ?,
        mentions_analyzed_at = ?, updated_at = ?
    WHERE user_id = ?
  `).run(
    clean(terms.brand_keywords ?? existing.brand_keywords),
    clean(terms.brand_handles ?? existing.brand_handles),
    clean(terms.exclude_terms ?? existing.exclude_terms),
    markAnalyzed ? now : existing.mentions_analyzed_at,
    now,
    userId,
  );
  return getOrgProfile(userId)!;
}

/** True when the user has at least one brand term to monitor. */
export function hasBrandTerms(profile: OrgProfileRecord | null): boolean {
  if (!profile) return false;
  return profile.brand_keywords.length > 0 || profile.brand_handles.length > 0;
}

/** Store the crawler SBU id + website analysis after /api/leads/generate runs. */
export function setOrgAnalysis(userId: string, sbuId: string, analysis: WebsiteAnalysis): void {
  const db = getAuthDb();
  const now = new Date().toISOString();
  // Ensure a row exists first (a user could generate before ever saving).
  if (!getOrgProfile(userId)) upsertOrgProfile(userId, {});
  db.prepare(`
    UPDATE org_profiles
    SET crawler_sbu_id = ?, analysis_json = ?, analyzed_at = ?, updated_at = ?
    WHERE user_id = ?
  `).run(sbuId, JSON.stringify(analysis), now, now, userId);
}
