/**
 * SYNQ Hub taxonomy — a small, controlled set of buyer-facing categories and
 * locations used for programmatic SEO faceting. `org_profiles.industry` and
 * `services` are free text, so we normalize them into this set at profile-save
 * time (stored on `hub_category`/`hub_location`) and query by column thereafter.
 *
 * Deliberately pragmatic (keyword match, no ML) and Africa-first. Extend the
 * keyword lists as real profiles come in — the founder confirms the category set.
 */

export interface HubCategory {
  /** URL slug segment, e.g. 'real-estate'. */
  slug: string;
  /** Display label, e.g. 'Real Estate'. */
  label: string;
  /** Lowercase keywords/synonyms matched against industry + services + summary. */
  match: string[];
}

/** ~16 Africa-relevant buyer verticals. Order is stable; slugs are permanent. */
export const HUB_CATEGORIES: HubCategory[] = [
  { slug: 'real-estate',          label: 'Real Estate',            match: ['real estate', 'property', 'properties', 'realty', 'housing', 'homes', 'apartment', 'land', 'estate', 'proptech'] },
  { slug: 'fintech',              label: 'Fintech',                match: ['fintech', 'payments', 'wallet', 'lending', 'loans', 'banking', 'financial technology', 'remittance', 'crypto', 'savings'] },
  { slug: 'financial-services',   label: 'Financial Services',     match: ['finance', 'financial services', 'insurance', 'accounting', 'investment', 'wealth', 'audit', 'tax', 'microfinance'] },
  { slug: 'logistics-delivery',   label: 'Logistics & Delivery',   match: ['logistics', 'delivery', 'shipping', 'freight', 'courier', 'haulage', 'supply chain', 'fulfilment', 'fulfillment', 'dispatch'] },
  { slug: 'agritech',             label: 'Agritech & Agriculture', match: ['agric', 'agriculture', 'agritech', 'farming', 'farm', 'produce', 'agro', 'food production'] },
  { slug: 'health-pharma',        label: 'Health & Pharma',        match: ['health', 'healthcare', 'medical', 'clinic', 'hospital', 'pharma', 'pharmacy', 'wellness', 'telemedicine', 'healthtech'] },
  { slug: 'education',            label: 'Education & Training',    match: ['education', 'edtech', 'school', 'training', 'learning', 'course', 'academy', 'tutoring', 'university'] },
  { slug: 'retail-ecommerce',     label: 'Retail & E-commerce',    match: ['retail', 'ecommerce', 'e-commerce', 'online store', 'marketplace', 'shopping', 'fashion', 'consumer goods', 'fmcg'] },
  { slug: 'construction',         label: 'Construction',           match: ['construction', 'building', 'civil engineering', 'contractor', 'infrastructure', 'architecture', 'engineering firm'] },
  { slug: 'energy-solar',         label: 'Energy & Solar',         match: ['energy', 'solar', 'power', 'renewable', 'electricity', 'inverter', 'off-grid', 'oil', 'gas'] },
  { slug: 'marketing-creative',   label: 'Marketing & Creative',   match: ['marketing', 'advertising', 'branding', 'creative', 'design agency', 'media', 'pr ', 'public relations', 'content', 'social media agency'] },
  { slug: 'it-software',          label: 'IT & Software',          match: ['software', 'saas', 'it services', 'technology', 'developers', 'app development', 'web development', 'cloud', 'data', 'ai '] },
  { slug: 'professional-services',label: 'Professional Services',  match: ['consulting', 'consultancy', 'legal', 'law firm', 'hr ', 'recruitment', 'advisory', 'professional services', 'bpo', 'outsourcing'] },
  { slug: 'hospitality-travel',   label: 'Hospitality & Travel',   match: ['hospitality', 'hotel', 'travel', 'tourism', 'restaurant', 'events', 'catering', 'lodging', 'short-let', 'airbnb'] },
  { slug: 'manufacturing',        label: 'Manufacturing',          match: ['manufacturing', 'factory', 'production', 'industrial', 'processing', 'packaging'] },
  { slug: 'automotive',           label: 'Automotive & Transport', match: ['automotive', 'car ', 'vehicle', 'transport', 'ride-hailing', 'mobility', 'auto '] },
];

/** Fallback bucket for listings that don't match any category. */
export const HUB_CATEGORY_OTHER: HubCategory = { slug: 'other', label: 'Other', match: [] };

const CATEGORY_BY_SLUG = new Map<string, HubCategory>(
  [...HUB_CATEGORIES, HUB_CATEGORY_OTHER].map((c) => [c.slug, c]),
);

export function categoryBySlug(slug: string): HubCategory | null {
  return CATEGORY_BY_SLUG.get(slug) ?? null;
}

export function categoryLabel(slug: string | null): string {
  return (slug && CATEGORY_BY_SLUG.get(slug)?.label) || HUB_CATEGORY_OTHER.label;
}

/**
 * Normalize a business's free-text fields into a category slug. Returns null
 * (→ "Other", excluded from programmatic category pages) when nothing matches.
 */
export function mapToCategory(input: {
  industry?: string | null;
  services?: string | null;
  summary?: string | null;
  keywords?: string[] | null;
}): string | null {
  const hay = [
    input.industry ?? '',
    input.services ?? '',
    input.summary ?? '',
    (input.keywords ?? []).join(' '),
  ].join(' ').toLowerCase();
  if (!hay.trim()) return null;

  let best: { slug: string; score: number } | null = null;
  for (const cat of HUB_CATEGORIES) {
    let score = 0;
    for (const kw of cat.match) if (hay.includes(kw)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { slug: cat.slug, score };
  }
  return best?.slug ?? null;
}

/* ── Locations (Africa-first) ─────────────────────────────────────────────── */

export interface HubLocation {
  slug: string;
  label: string;
  /** Country code for grouping; ccTLD hints for website-based inference. */
  country: string;
  match: string[];
  tld?: string[];
}

export const HUB_LOCATIONS: HubLocation[] = [
  { slug: 'lagos',        label: 'Lagos',        country: 'NG', match: ['lagos', 'lekki', 'ikeja', 'victoria island', 'ikoyi'], tld: ['.ng', '.com.ng'] },
  { slug: 'abuja',        label: 'Abuja',        country: 'NG', match: ['abuja', 'fct'], tld: ['.ng'] },
  { slug: 'nigeria',      label: 'Nigeria',      country: 'NG', match: ['nigeria', 'nigerian', 'port harcourt', 'ibadan', 'kano'], tld: ['.ng', '.com.ng'] },
  { slug: 'accra',        label: 'Accra',        country: 'GH', match: ['accra', 'ghana', 'ghanaian'], tld: ['.gh', '.com.gh'] },
  { slug: 'nairobi',      label: 'Nairobi',      country: 'KE', match: ['nairobi', 'kenya', 'kenyan', 'mombasa'], tld: ['.ke', '.co.ke'] },
  { slug: 'johannesburg', label: 'Johannesburg', country: 'ZA', match: ['johannesburg', 'joburg', 'sandton'], tld: ['.za', '.co.za'] },
  { slug: 'cape-town',    label: 'Cape Town',    country: 'ZA', match: ['cape town'], tld: ['.za', '.co.za'] },
  { slug: 'south-africa', label: 'South Africa', country: 'ZA', match: ['south africa', 'south african', 'durban', 'pretoria'], tld: ['.za', '.co.za'] },
  { slug: 'cairo',        label: 'Cairo',        country: 'EG', match: ['cairo', 'egypt', 'egyptian'], tld: ['.eg', '.com.eg'] },
  { slug: 'kigali',       label: 'Kigali',       country: 'RW', match: ['kigali', 'rwanda'], tld: ['.rw'] },
  { slug: 'africa',       label: 'Africa',       country: 'XX', match: ['africa', 'african', 'pan-african'] },
];

const LOCATION_BY_SLUG = new Map<string, HubLocation>(HUB_LOCATIONS.map((l) => [l.slug, l]));

export function locationBySlug(slug: string): HubLocation | null {
  return LOCATION_BY_SLUG.get(slug) ?? null;
}

export function locationLabel(slug: string | null): string {
  return (slug && LOCATION_BY_SLUG.get(slug)?.label) || 'Africa';
}

/**
 * Infer a normalized location slug. Priority: explicit text (about/services) →
 * a supplied signals-derived location string → website ccTLD → 'africa' default.
 */
export function deriveLocation(input: {
  text?: string | null;
  signalLocation?: string | null;
  website?: string | null;
}): string {
  const text = `${input.text ?? ''} ${input.signalLocation ?? ''}`.toLowerCase();
  if (text.trim()) {
    // Prefer the most specific (city) match over country by checking cities first.
    for (const loc of HUB_LOCATIONS) {
      if (loc.country === 'XX') continue;
      for (const m of loc.match) if (text.includes(m)) return loc.slug;
    }
  }
  const site = (input.website ?? '').toLowerCase();
  if (site) {
    for (const loc of HUB_LOCATIONS) {
      for (const t of loc.tld ?? []) if (site.includes(t)) return loc.slug;
    }
  }
  return 'africa';
}
