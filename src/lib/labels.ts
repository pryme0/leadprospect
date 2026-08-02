/* ─────────────────────────────────────────────────────────────────────────────
 * Plain-language labels — one source of truth for turning technical enums and
 * internal jargon into words a non-technical business owner understands.
 *
 * Rule of thumb: nobody outside the team should ever see HIGH_INTENT, "signal",
 * "crawler", "GHL", or "sync". Map it here and use the helper everywhere.
 * ──────────────────────────────────────────────────────────────────────────── */

export type IntentTone = 'hot' | 'warm' | 'cool' | 'unknown';

/** Buying-intent enum → { label, tone } for a coloured badge. */
export function intentInfo(v: string | null | undefined): { label: string; tone: IntentTone } {
  const s = (v || '').toUpperCase();
  if (s.includes('HIGH')) return { label: 'Hot', tone: 'hot' };
  if (s.includes('MEDIUM')) return { label: 'Warm', tone: 'warm' };
  if (s.includes('LOW')) return { label: 'Cool', tone: 'cool' };
  return { label: 'New', tone: 'unknown' };
}

/** Just the plain word for a buying-intent level. */
export function intentLabel(v: string | null | undefined): string {
  return intentInfo(v).label;
}

/** Buying-readiness tier from the Hot Lead Score. */
export type LeadTier = 'immediate' | 'hot' | 'warm' | 'monitor' | 'ignore';

/** Tier → plain label + tone for a badge. */
export function tierInfo(tier: string | null | undefined): { label: string; tone: IntentTone } {
  switch ((tier || '').toLowerCase()) {
    case 'immediate': return { label: 'Act now', tone: 'hot' };
    case 'hot':       return { label: 'Hot',      tone: 'hot' };
    case 'warm':      return { label: 'Warm',     tone: 'warm' };
    case 'monitor':   return { label: 'Watching', tone: 'cool' };
    case 'ignore':    return { label: 'Low',      tone: 'unknown' };
    default:          return { label: 'New',      tone: 'unknown' };
  }
}

/**
 * Derive a display tier for a lead. Prefers the real Hot Lead Score / tier from
 * the scoring engine; falls back to the coarse intent_level for rows classified
 * before scoring shipped.
 */
export function leadTier(opts: { tier?: string | null; hotScore?: number | null; intentLevel?: string | null }): LeadTier {
  if (opts.tier) {
    const t = opts.tier.toLowerCase();
    if (t === 'immediate' || t === 'hot' || t === 'warm' || t === 'monitor' || t === 'ignore') return t;
  }
  if (typeof opts.hotScore === 'number') {
    const s = opts.hotScore;
    return s >= 95 ? 'immediate' : s >= 85 ? 'hot' : s >= 70 ? 'warm' : s >= 50 ? 'monitor' : 'ignore';
  }
  const lvl = (opts.intentLevel || '').toUpperCase();
  if (lvl.includes('HIGH')) return 'hot';
  if (lvl.includes('MEDIUM')) return 'warm';
  return 'monitor';
}

/** Longer, friendly one-liner explaining what an intent level means. */
export function intentHint(tone: IntentTone): string {
  switch (tone) {
    case 'hot':  return 'Ready to buy — reach out now';
    case 'warm': return 'Interested — worth a follow-up';
    case 'cool': return 'Just looking for now';
    default:     return 'Not sorted yet';
  }
}

/** CRM delivery state. `synced` is a boolean-ish or the GHL contact id. */
export function crmStatusLabel(sent: boolean | string | null | undefined): string {
  const isSent = typeof sent === 'string' ? sent.trim().length > 0 : !!sent;
  return isSent ? 'Sent to your CRM' : 'Not sent yet';
}

/** Short verb for the "send this lead onward" action. */
export function crmActionLabel(sent: boolean | string | null | undefined): string {
  const isSent = typeof sent === 'string' ? sent.trim().length > 0 : !!sent;
  return isSent ? 'Sent' : 'Send to CRM';
}

/** Where a lead came from — friendly channel name + (optional) parent group. */
const CHANNEL_NAMES: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  ig: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  fb: 'Facebook',
  threads: 'Threads',
  whatsapp: 'WhatsApp',
  email: 'Email',
  web: 'Website',
  website: 'Website',
};

export function channelLabel(v: string | null | undefined): string {
  if (!v) return 'Unknown';
  const key = v.trim().toLowerCase();
  return CHANNEL_NAMES[key] || prettify(v);
}

/**
 * Generic snake_case / SCREAMING_CASE → Title Case, with a curated dictionary
 * for terms that need a friendlier word than a naive title-case would give.
 */
const FRIENDLY_TERMS: Record<string, string> = {
  crawler: 'lead finder',
  crawl: 'search',
  crawling: 'searching for leads',
  signal: 'buyer activity',
  signals: 'buyer activity',
  dedupe: 'duplicate check',
  deduplication: 'duplicate check',
  ghl: 'your CRM',
  sync: 'send to CRM',
  synced: 'sent to CRM',
  unsynced: 'not sent yet',
  routing: 'sending',
  unclassified: 'new',
  uncategorized: 'other',
};

/** Look up a friendly replacement for a single jargon word (case-insensitive). */
export function friendlyTerm(word: string): string | undefined {
  return FRIENDLY_TERMS[word.trim().toLowerCase()];
}

/** snake_case / SCREAMING_CASE / kebab → "Title Case" fallback. */
export function prettify(v: string | null | undefined, fallback = 'Other'): string {
  if (!v) return fallback;
  return v
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

/** Category enum → friendly label (uses the dictionary, then title-cases). */
export function categoryLabel(v: string | null | undefined): string {
  if (!v) return 'Other';
  const key = v.trim().toLowerCase();
  return friendlyTerm(key) ? capitalize(friendlyTerm(key)!) : prettify(v);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
