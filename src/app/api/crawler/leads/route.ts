import { NextResponse } from 'next/server';
import { listSignals } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';
import { getUserFromRequest } from '@/lib/auth/session';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { getUserTier } from '@/lib/subscription/server-store';
import { TIER_LIMITS } from '@/lib/subscription/tiers';
import { getActiveBonusLeadsPerDay } from '@/lib/referrals/store';
import { getOrgProfile } from '@/lib/settings/org-store';
import { syncPipelineForOrg, getPipelineStagesByLeadIds } from '@/lib/pipeline/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crawler/leads — the logged-in user's outbound lead list.
 *
 * Leads are scoped to the user's crawler SBU (set by /api/leads/generate), so
 * each user only sees prospects generated from their own website analysis.
 * Mirrors the crawler's /api/signals/leads shaping: excludes non-prospects,
 * dedupes one row per person, orders by urgency.
 * Query: page, limit, source_tool (→ ingestion_category), intent_level, with_email.
 */
export async function GET(req: Request) {
  try {
    // Identify the user and resolve their per-user SBU scope. `sbu` falls back to
    // the deterministic id derived from the user (works across environments even
    // when this env's org profile is empty); `provisioned` drives the setup hint.
    const user = getUserFromRequest(req);
    const { sbu, provisioned } = await resolveUserSbu(req);

    // Not authenticated → nothing to show.
    if (!sbu) {
      return NextResponse.json({
        leads: [], data: [], total: 0, total_pages: 1, totalPages: 1,
        pagination: { total: 0, total_pages: 1 },
        needs_generation: !provisioned,
      });
    }

    const sp = new URL(req.url).searchParams;
    const limit = Math.min(Number(sp.get('limit') ?? 20) || 20, 500);
    const page = Math.max(1, Number(sp.get('page') ?? 1));
    const offset = (page - 1) * limit;

    const intent = sp.get('intent_level');
    // Show leads from ALL channels (LinkedIn, TikTok, etc.). Social leads (TikTok/
    // IG) can't be email-enriched (Apollo is LinkedIn-based), so email is an
    // opt-in FILTER, not a default gate: pass ?with_email=true for contactable-only.
    const withEmail = sp.get('with_email') === 'true';

    // Basic-tier daily HIGH-intent cap: scope to today's crop and clamp the page
    // size to the plan's daily allowance. Nothing is deleted — leads generated
    // beyond the cap simply aren't surfaced until the next day (fresh `since`
    // boundary) or an upgrade. Only applies when the caller is explicitly asking
    // for HIGH_INTENT leads (the tier promise is specifically about that bucket).
    let since: string | undefined;
    let dailyCapLimit = limit;
    if (user && intent === 'HIGH_INTENT') {
      const tier = await getUserTier(user.org) ?? 'basic';
      const cap = TIER_LIMITS[tier].maxHighIntentLeadsPerDay;
      if (cap !== null) {
        // Referral rewards top up the daily cap while a redeemed bonus is active.
        const bonus = await getActiveBonusLeadsPerDay(user.org);
        since = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
        dailyCapLimit = Math.min(limit, cap + bonus);
      }
    }

    // Lead geo-fencing (Settings → Lead sourcing region): surface leads located
    // in the org's chosen countries, PLUS leads whose location is unknown (so
    // TikTok/Instagram — which expose no location — aren't silently zeroed out).
    // Only leads explicitly tagged to a different country are dropped. Filters on
    // the signal's already-resolved country_code, not a platform-specific param.
    const geoCountries = user ? (await getOrgProfile(user.org))?.geo_countries : undefined;

    const { signals, total } = await listSignals({
      sbu,
      intentLevel: intent === 'HIGH_INTENT' || intent === 'MEDIUM_INTENT' || intent === 'LOW_INTENT' ? intent : undefined,
      hasEmail: withEmail ? true : undefined,
      since,
      countryCodes: geoCountries && geoCountries.length > 0 ? geoCountries : undefined,
      orderBy: 'urgency_score',
      excludeNonProspects: true,
      deduplicateByPerson: true,
      limit: dailyCapLimit,
      offset,
    });

    let data = signals.map(toUiLead);
    // source_tool filter maps to the mapped ingestion_category/source label.
    const sourceTool = sp.get('source_tool');
    if (sourceTool) data = data.filter((l) => l.source_tool === sourceTool);

    // Merge in the sales-pipeline stage (self-healing: any new HIGH/MEDIUM lead
    // not yet tracked gets auto-entered as 'new' before we read stages back).
    if (user) {
      await syncPipelineForOrg(user.org, sbu).catch(() => {});
      const stages = await getPipelineStagesByLeadIds(user.org, data.map((l) => l.id))
        .catch(() => ({} as Awaited<ReturnType<typeof getPipelineStagesByLeadIds>>));
      data = data.map((l) => ({
        ...l,
        pipeline_stage: stages[l.id]?.stage ?? null,
        pipeline_follow_up_at: stages[l.id]?.follow_up_at ?? null,
      }));
    }

    const total_pages = Math.max(1, Math.ceil(total / limit));
    return NextResponse.json({
      leads: data,
      data,
      total,
      total_pages,
      totalPages: total_pages,
      pagination: { total, total_pages },
    });
  } catch (err) {
    console.error('[GET /api/crawler/leads]', err);
    return NextResponse.json(
      { error: 'Failed to load leads', leads: [], data: [], total: 0, total_pages: 1, pagination: { total: 0, total_pages: 1 } },
      { status: 500 },
    );
  }
}
