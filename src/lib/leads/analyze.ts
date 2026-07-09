/**
 * Website → lead-targeting analysis.
 *
 * Given the readable text of a company's website plus the operator-supplied
 * "about" / "services" context, the model derives:
 *   - a short summary of what the company does,
 *   - its target audience (ICP),
 *   - the audience's pain points,
 *   - a set of LinkedIn/Discord search keywords in the crawler's proven style
 *     (first-person job-seeker pain phrasing, e.g. "laid off software engineer
 *     looking for work", "can't find a nursing job").
 *
 * Called server-side only. Uses the provider-agnostic JSON helper (OpenAI, with
 * a Gemini fallback) — see src/lib/llm/json.ts.
 */
import type { WebsiteAnalysis, BrandTerms } from '@/lib/settings/org-store';
import { llmJson, llmConfigured } from '@/lib/llm/json';

const MAX_KEYWORDS = 25;

export function analysisConfigured(): boolean {
  return llmConfigured();
}

const SYSTEM_PROMPT = `You are a lead-generation strategist for a platform that finds prospects on social media by keyword-searching for people who publicly post pain, frustration, or a need that the company can solve. Different platforms need DIFFERENT search terms, so you produce separate keyword sets.

You will be given a company's website text plus operator notes about what they do. Produce:
1. summary: 1-2 sentences on what the company actually does.
2. target_audience: who their ideal customer / prospect is (the person the company wants to reach).
3. pain_points: the specific problems that audience posts about publicly.
4. keywords: 15-25 LinkedIn/Discord search phrases (3-8 words) written in the FIRST PERSON, as the prospect themselves would write them in a moment of frustration or need — the exact kind of post the company would want to reply to. These drive a text-search crawler, so they must be things a real person in pain would actually type, not marketing terms.
5. keywords_tiktok: 12-20 SHORT terms (1-3 words) for TikTok video search — how consumers actually search and tag content on TikTok. Topical, casual, aspirational. e.g. for a travel company: "africa travel", "solo travel tips", "group trip planning", "travel scams", "budget safari". Include a few hashtag candidates (with or without #). NOT full sentences.
6. keywords_instagram: 12-20 SHORT hashtag-style terms (1-2 words) for Instagram tag search — real tags people use. e.g. "africatravel", "solotravel", "grouptrip", "traveldeals". Single concatenated tags or short 1-2 word phrases. NOT full sentences.

Rules for keywords (LinkedIn/Discord, field 4):
- First person, present-tense, emotionally specific. Good: "just got laid off software engineer", "can't find a nursing job". Bad: "cybersecurity training" (a category).
- Could ONLY someone personally experiencing this pain write it — not a recruiter, coach, or the company itself? If a marketer could write it, drop it.
- No hashtags, no quotes, no numbering.

Rules for keywords_tiktok and keywords_instagram (fields 5-6):
- SHORT and TOPICAL — these are search-box/hashtag terms, NOT sentences. A long first-person sentence returns creators/how-to content, not prospects, so keep them 1-3 words.
- Real terms consumers actually type/tag. Tailor to THIS company's audience and topic.
- Hashtags allowed. No numbering.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    target_audience: { type: 'string' },
    pain_points: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
    keywords_tiktok: { type: 'array', items: { type: 'string' } },
    keywords_instagram: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'target_audience', 'pain_points', 'keywords', 'keywords_tiktok', 'keywords_instagram'],
  additionalProperties: false,
} as const;

function buildUserContent(input: {
  companyName: string;
  website: string;
  about: string;
  services: string;
  industry: string;
  websiteText: string;
}): string {
  return [
    `Company name: ${input.companyName || '(unknown)'}`,
    `Website: ${input.website}`,
    input.industry ? `Industry: ${input.industry}` : '',
    input.about ? `Operator notes — about the company:\n${input.about}` : '',
    input.services ? `Operator notes — what they do / who they serve:\n${input.services}` : '',
    '',
    'Website text (may be truncated):',
    input.websiteText,
  ].filter(Boolean).join('\n');
}

function sanitizeKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of raw) {
    if (typeof k !== 'string') continue;
    const cleaned = k.trim().replace(/^["'#]+|["']+$/g, '').replace(/\s+/g, ' ');
    const key = cleaned.toLowerCase();
    if (cleaned.length < 3 || cleaned.length > 120 || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

/**
 * Sanitize short social search terms (TikTok/Instagram). Unlike LinkedIn pain
 * phrases these are meant to be short and topical — we keep a leading `#` off
 * (the crawlers add tags themselves), strip surrounding quotes, drop anything
 * longer than a short phrase, and cap the list.
 */
function sanitizeSocialTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of raw) {
    if (typeof k !== 'string') continue;
    const cleaned = k.trim().replace(/^["'#]+|["']+$/g, '').replace(/\s+/g, ' ');
    const key = cleaned.toLowerCase();
    // Social terms should stay short: <= 4 words and <= 40 chars.
    if (cleaned.length < 2 || cleaned.length > 40 || cleaned.split(' ').length > 4 || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= 20) break;
  }
  return out;
}

/**
 * Run the analysis. Throws if no LLM provider is configured or the API errors —
 * the caller (/api/leads/generate) turns that into a 5xx with a clear message.
 */
export async function analyzeWebsite(input: {
  companyName: string;
  website: string;
  about: string;
  services: string;
  industry: string;
  websiteText: string;
}): Promise<WebsiteAnalysis> {
  const parsed = await llmJson(SYSTEM_PROMPT, buildUserContent(input), OUTPUT_SCHEMA, 2000);

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    target_audience: typeof parsed.target_audience === 'string' ? parsed.target_audience : '',
    pain_points: Array.isArray(parsed.pain_points)
      ? parsed.pain_points.filter((p): p is string => typeof p === 'string').slice(0, 30)
      : [],
    keywords: sanitizeKeywords(parsed.keywords),
    keywords_tiktok: sanitizeSocialTerms(parsed.keywords_tiktok),
    keywords_instagram: sanitizeSocialTerms(parsed.keywords_instagram),
  };
}

/* ── Company Context auto-fill (settings profile) ─────────────────────────────── */

export interface CompanyContext {
  industry: string;
  about: string;
  services: string;
  expectations: string;
}

const CONTEXT_SYSTEM_PROMPT = `You help a business fill out its company profile inside a lead-intelligence platform, using text crawled from its OWN website. Write first-party copy as the company itself ("we"), grounded ONLY in the provided website text and notes. Do NOT invent facts, awards, metrics, or offerings that the text does not support.

Produce:
1. industry: 2-5 words naming the company's industry/vertical (e.g. "Real Estate", "B2B SaaS", "Fintech", "Travel & Tourism", "Marketing Agency").
2. about: 1-3 sentences on who the company is and what it does, first person ("We ...").
3. services: 1-3 sentences on what they sell and who they serve (products/services + ideal customers).
4. expectations: 1-2 sentences describing a great outcome from using a lead platform, inferred from what the business does (the kind of customers they'd want to reach and how they'd want leads handled).

Rules: Be specific and concrete, not generic marketing fluff. If the website text is thin, keep it short rather than fabricating. Plain text only — no markdown, no bullet points, no surrounding quotes.`;

const CONTEXT_SCHEMA = {
  type: 'object',
  properties: {
    industry: { type: 'string' },
    about: { type: 'string' },
    services: { type: 'string' },
    expectations: { type: 'string' },
  },
  required: ['industry', 'about', 'services', 'expectations'],
  additionalProperties: false,
} as const;

/**
 * Derive the settings "Company Context" fields (industry / about / services /
 * expectations) from a crawl of the company's website. Existing operator notes
 * are passed in as hints but the website text is the primary source.
 */
export async function analyzeCompanyContext(input: {
  companyName: string;
  website: string;
  industry?: string;
  about?: string;
  services?: string;
  websiteText: string;
}): Promise<CompanyContext> {
  const userContent = [
    `Company name: ${input.companyName || '(unknown)'}`,
    `Website: ${input.website}`,
    input.industry ? `Existing industry note: ${input.industry}` : '',
    input.about ? `Existing about note:\n${input.about}` : '',
    input.services ? `Existing services note:\n${input.services}` : '',
    '',
    'Website text (may be truncated):',
    input.websiteText,
  ].filter(Boolean).join('\n');

  const parsed = await llmJson(CONTEXT_SYSTEM_PROMPT, userContent, CONTEXT_SCHEMA, 900);
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    industry: str(parsed.industry).slice(0, 120),
    about: str(parsed.about).slice(0, 1000),
    services: str(parsed.services).slice(0, 1000),
    expectations: str(parsed.expectations).slice(0, 1000),
  };
}

/* ── Brand mention monitoring terms ──────────────────────────────────────────── */

const BRAND_SYSTEM_PROMPT = `You configure a social-listening tool. Given a company's website and notes, produce the terms to MONITOR the web/social for MENTIONS OF THIS COMPANY (its brand, products, and people) — the opposite of prospect pain phrases.

Produce:
1. brand_keywords: 5-15 exact terms people use when talking ABOUT this company — the company name, product/app names, notable brand phrases, and obvious spelling variants. Include the plain company name. These are matched against public posts/articles.
2. brand_handles: 0-8 likely social handles / usernames for the company (e.g. "@acme", "acmehq"), inferred from the name and website. Best-effort; omit if unsure rather than invent noise.
3. exclude_terms: 0-15 words that signal a DIFFERENT meaning of an ambiguous brand name (to filter false positives). If the company name is a common word (e.g. "Apple", "Pulse", "Notion"), list contexts to exclude (e.g. "fruit", "heart rate"). If the name is already distinctive, return an empty array.

Rules: no hashtags, no numbering, no duplicates. Keep terms short. Prefer precision over recall — a noisy brand term is worse than a missing one.`;

const BRAND_SCHEMA = {
  type: 'object',
  properties: {
    brand_keywords: { type: 'array', items: { type: 'string' } },
    brand_handles: { type: 'array', items: { type: 'string' } },
    exclude_terms: { type: 'array', items: { type: 'string' } },
  },
  required: ['brand_keywords', 'brand_handles', 'exclude_terms'],
  additionalProperties: false,
} as const;

function sanitizeTerms(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of raw) {
    if (typeof k !== 'string') continue;
    const cleaned = k.trim().replace(/^["'#]+|["']+$/g, '').replace(/\s+/g, ' ');
    const key = cleaned.toLowerCase();
    if (cleaned.length < 2 || cleaned.length > 80 || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Derive brand-monitoring terms from the company profile/website. Always seeds
 * the plain company name so monitoring works even if the model is terse.
 */
export async function analyzeBrand(input: {
  companyName: string;
  website: string;
  about: string;
  services: string;
  industry: string;
  summary?: string;
  websiteText?: string;
}): Promise<BrandTerms> {
  const userContent = [
    `Company name: ${input.companyName || '(unknown)'}`,
    `Website: ${input.website}`,
    input.industry ? `Industry: ${input.industry}` : '',
    input.summary ? `What they do: ${input.summary}` : '',
    input.about ? `About:\n${input.about}` : '',
    input.services ? `Products/services:\n${input.services}` : '',
    input.websiteText ? `\nWebsite text (may be truncated):\n${input.websiteText}` : '',
  ].filter(Boolean).join('\n');

  const parsed = await llmJson(BRAND_SYSTEM_PROMPT, userContent, BRAND_SCHEMA, 1200);

  const brand_keywords = sanitizeTerms(parsed.brand_keywords, 15);
  // Guarantee the plain company name is monitored.
  if (input.companyName && !brand_keywords.some((k) => k.toLowerCase() === input.companyName.trim().toLowerCase())) {
    brand_keywords.unshift(input.companyName.trim());
  }
  return {
    brand_keywords: brand_keywords.slice(0, 16),
    brand_handles: sanitizeTerms(parsed.brand_handles, 8),
    exclude_terms: sanitizeTerms(parsed.exclude_terms, 15),
  };
}
