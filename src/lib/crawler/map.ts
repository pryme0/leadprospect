/**
 * Maps crawler `signals` rows into the shapes the existing admin UI expects
 * (the shapes the old mock layer produced). Keeps the frontend untouched while
 * every field is now backed by a real crawler record.
 */
import type { SignalRow, SignalStats } from './signals-db';

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function firstName(full: string | null | undefined): string {
  if (!full) return '';
  return full.trim().split(/\s+/)[0] ?? '';
}

/** Crawler signal → the admin Signals shape. */
export function toUiSignal(r: SignalRow) {
  return {
    id: r.id,
    source: r.source,
    username: r.username ?? '',
    name: r.name,
    email: r.email ?? r.enriched_email ?? null,
    phone: r.phone ?? r.enriched_phone ?? null,
    content: r.content ?? '',
    url: r.url ?? r.post_url ?? r.profile_url ?? '',
    timestamp: toIso(r.timestamp) ?? toIso(r.created_at) ?? '',
    intent_level: r.intent_level,
    intent_category: r.intent_category,
    ingestion_category: r.ingestion_category,
    pain_points: Array.isArray(r.pain_points) ? r.pain_points : [],
    urgency_score: r.urgency_score ?? 0,
    summary: r.summary ?? '',
    processed: !!r.processed,
    content_hash: r.content_hash ?? '',
    created_at: toIso(r.created_at) ?? '',
    classified_at: toIso(r.classified_at),
    automation_sent_at: null,
    enriched_name: r.enriched_name,
    enriched_email: r.enriched_email,
    enriched_phone: r.enriched_phone,
    enriched_company: r.enriched_company,
    enriched_title: r.enriched_title,
    enriched_linkedin_url: r.enriched_linkedin_url,
    enriched_via: r.enriched_via,
    enriched_at: toIso(r.enriched_at),
    ghl_contact_id: null,
    ...hotScoreFields(r),
  };
}

/** Shared Hot Lead Score fields surfaced to the UI (null on pre-scoring rows). */
function hotScoreFields(r: SignalRow) {
  const i = r.intent ?? null;
  return {
    hot_lead_score: r.hot_lead_score ?? i?.hot_lead_score ?? null,
    lead_tier: i?.lead_tier ?? null,
    detected_intent: i?.detected_intent ?? null,
    score_reason: i?.reason ?? null,
    recommended_response_time: i?.recommended_response_time ?? null,
    recommended_outreach: i?.recommended_outreach ?? null,
    score_breakdown: i?.score_breakdown ?? null,
    score_confidence: i?.confidence ?? null,
  };
}

/**
 * Crawler signal → the admin Lead Queue shape. Crawled people have NOT opted in,
 * so `consented` is false (the UI correctly flags them "Consent needed").
 * `lead_source: 'cr'` is what the UI maps to the "Agent Crawler" badge.
 * Window/Value columns are repurposed to surface the real intent category and
 * enriched role/company rather than invented pipeline values.
 */
export function toUiLead(r: SignalRow) {
  const role = [r.enriched_title, r.enriched_company].filter(Boolean).join(' · ');
  return {
    id: r.id,
    first_name: firstName(r.name ?? r.enriched_name),
    email: r.enriched_email ?? r.email ?? '',
    phone_number: r.enriched_phone ?? r.phone ?? '',
    timeline_to_start: r.intent_category ?? '',
    income_goal: role,
    source_tool: r.ingestion_category ?? r.source ?? 'linkedin',
    intent_level: r.intent_level ?? 'MEDIUM_INTENT',
    consented: false,
    ghl_contact_id: null,
    lead_source: 'cr',
    created_at: toIso(r.created_at) ?? '',
    // Outreach identity — the platform + author handle/URLs needed to reach this
    // person directly from the Lead Queue (see /api/outreach/*).
    source: r.source ?? 'linkedin',
    username: r.username ?? null,
    profile_url: r.profile_url ?? r.enriched_linkedin_url ?? null,
    post_url: r.post_url ?? r.url ?? null,
    // Direct link to the exact signal — the comment permalink for comment leads,
    // the post permalink for post leads (used as the outreach "reference" link).
    url: r.url ?? r.post_url ?? r.profile_url ?? null,
    post_content: r.content ?? null,
    summary: r.summary ?? null,
    ...hotScoreFields(r),
  };
}

/** Crawler stats → the admin SignalStats shape (crawler has no outbound automation layer). */
export function toUiStats(s: SignalStats) {
  return {
    total: s.total,
    processed: s.processed,
    pending: s.pending,
    withEmail: s.withEmail,
    automationSent: 0,
    automationSentToday: 0,
    automationSentYesterday: 0,
    automationPending: 0,
    byIntentLevel: s.byIntentLevel,
    byIntentCategory: s.byIntentCategory,
    byIngestionCategory: s.byIngestionCategory,
  };
}
