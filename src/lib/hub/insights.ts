/**
 * SYNQ Hub demand-insight layer — the USP. Turns SYNQ's interest signals
 * into publishable, AI-citable "what people want" content.
 *
 * PRIVACY IS ENFORCED HERE, IN ONE PLACE. Everything below reads only AGGREGATES
 * (counts, pain-point strings, platform shares) — never a lead's identity. The
 * hub pages MUST source all signal data from this module and never call the
 * row-level `listSignals`. K-anonymity guardrails:
 *   - suppress entirely below MIN_SIGNALS underlying signals, and
 *   - for category aggregates, below MIN_BUSINESSES distinct businesses.
 * Volumes are rounded to bands so exact counts are never exposed.
 */
import { getSignalsPool, dashboardMetrics } from '@/lib/crawler/signals-db';
import { sbuIdForUser } from '@/lib/crawler/control-client';

const MIN_SIGNALS = 20;    // below this a metric is too thin / not anonymous enough
const MIN_BUSINESSES = 3;  // category aggregates need ≥3 businesses to stay anonymous

export interface HubInsight {
  available: boolean;
  /** Rounded demand volume, e.g. "100+ people looking to buy". */
  demandBand: string;
  /** Top buyer needs/pain points (natural language — the AI-citation magnet). */
  painPoints: string[];
  /** Where buyers are active, as platform → share (0-1). */
  platforms: { platform: string; share: number }[];
  /** Week-over-week change in high-intent demand (%), or null if not meaningful. */
  wowTrendPct: number | null;
  /** Number of businesses the aggregate spans (category insight only). */
  businesses?: number;
}

const SUPPRESSED: HubInsight = { available: false, demandBand: '', painPoints: [], platforms: [], wowTrendPct: null };

/** Round a raw count down to a public band so exact volumes are never exposed. */
function band(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000) * 1000}+`;
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 50) return '50+';
  if (n >= MIN_SIGNALS) return '20+';
  return `${n}`;
}

function platformShares(rows: { platform: string; count: number }[]): { platform: string; share: number }[] {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (!total) return [];
  return rows
    .filter((r) => r.platform)
    .map((r) => ({ platform: r.platform, share: r.count / total }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 4);
}

/**
 * Demand insight for a single business profile. Reuses `dashboardMetrics` (all
 * aggregates). Suppressed when the business has < MIN_SIGNALS signals.
 */
export async function getListingInsight(orgId: string): Promise<HubInsight> {
  try {
    const m = await dashboardMetrics(sbuIdForUser(orgId));
    if (!m || m.total_signals < MIN_SIGNALS) return SUPPRESSED;
    return {
      available: true,
      demandBand: `${band(m.total_signals)} people looking to buy`,
      painPoints: m.top_pain_points.slice(0, 5).map((p) => p.point).filter(Boolean),
      platforms: platformShares(m.signals_by_platform),
      wowTrendPct: Number.isFinite(m.high_intent_wow) && m.high_intent_wow !== 0 ? m.high_intent_wow : null,
    };
  } catch {
    return SUPPRESSED; // signals DB unreachable → profile renders without the block
  }
}

/**
 * Aggregated demand insight across a set of businesses (a category / category×
 * location page). Suppressed unless it spans ≥ MIN_BUSINESSES businesses AND
 * ≥ MIN_SIGNALS signals — so no single business is identifiable from it.
 */
export async function getCategoryInsight(orgIds: string[]): Promise<HubInsight> {
  const pool = getSignalsPool();
  if (!pool || orgIds.length === 0) return SUPPRESSED;
  const sbus = orgIds.map(sbuIdForUser);
  try {
    const [totals, pains, platforms] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total, COUNT(DISTINCT sbu_id)::int AS businesses
         FROM signals WHERE sbu_id = ANY($1)`,
        [sbus],
      ),
      pool.query(
        `SELECT pp AS point, COUNT(*)::int AS count
         FROM signals, jsonb_array_elements_text(pain_points) pp
         WHERE jsonb_typeof(pain_points) = 'array' AND sbu_id = ANY($1)
         GROUP BY pp ORDER BY count DESC LIMIT 8`,
        [sbus],
      ),
      pool.query(
        `SELECT source AS platform, COUNT(*)::int AS count
         FROM signals WHERE sbu_id = ANY($1) GROUP BY source ORDER BY count DESC`,
        [sbus],
      ),
    ]);
    const total = (totals.rows[0]?.total as number) ?? 0;
    const businesses = (totals.rows[0]?.businesses as number) ?? 0;
    if (total < MIN_SIGNALS || businesses < MIN_BUSINESSES) return SUPPRESSED;
    return {
      available: true,
      demandBand: `${band(total)} people looking to buy`,
      painPoints: (pains.rows as { point: string }[]).slice(0, 6).map((p) => p.point).filter(Boolean),
      platforms: platformShares(platforms.rows as { platform: string; count: number }[]),
      wowTrendPct: null,
      businesses,
    };
  } catch {
    return SUPPRESSED;
  }
}
