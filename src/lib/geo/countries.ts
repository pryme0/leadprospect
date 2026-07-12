/**
 * Countries selectable for per-org lead geo-fencing (Settings → Lead Sourcing
 * Region). This list MUST stay a subset of thelixcrawler's `COUNTRY_GEO_URN`
 * map (src/config.ts there) — only ship a country here once its LinkedIn geo
 * URN has been verified (an unverified/guessed URN silently returns wrong or
 * zero results instead of erroring, which is worse than no filter).
 *
 * Nigeria is first because this feature exists specifically because a customer
 * reported getting leads outside Nigeria — this is the flagship use case.
 * To add a country: find its numeric LinkedIn geo URN via LinkedIn's own
 * location typeahead (inspect the network request when typing the country
 * into LinkedIn's search location filter), add it to COUNTRY_GEO_URN in the
 * crawler, then add it here.
 */
export interface GeoCountry {
  code: string; // ISO 3166-1 alpha-2
  name: string;
}

export const GEO_COUNTRIES: GeoCountry[] = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'IN', name: 'India' },
];

const VALID_CODES = new Set(GEO_COUNTRIES.map((c) => c.code));

export function countryName(code: string): string {
  return GEO_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/** Sanitize arbitrary input into a deduped list of known, uppercase country codes. */
export function sanitizeCountryCodes(raw: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const code = v.trim().toUpperCase();
    if (!VALID_CODES.has(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length >= 10) break;
  }
  return out;
}
