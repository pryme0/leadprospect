import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { listSignals, type SignalQuery } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';
import { orgLeadRoster } from '@/lib/super/orgs';

export const dynamic = 'force-dynamic';

const INTENT: SignalQuery['intentLevel'][] = ['LOW_INTENT', 'MEDIUM_INTENT', 'HIGH_INTENT'];

/**
 * GET /api/super/leads — leads across ALL organizations (or one, via ?org=).
 * Each org's leads live under its crawler SBU (sbuIdForUser); with no org filter
 * listSignals spans the whole pool. Every lead is annotated with its company.
 * Params: org, page, limit, intent_level, source.
 */
export async function GET(req: Request) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const url = new URL(req.url);
    const orgFilter = url.searchParams.get('org') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10) || 25));
    const rawIntent = url.searchParams.get('intent_level') || '';
    const intentLevel = INTENT.includes(rawIntent as SignalQuery['intentLevel']) ? (rawIntent as SignalQuery['intentLevel']) : undefined;
    const source = url.searchParams.get('source') || undefined;
    const search = url.searchParams.get('q')?.trim() || undefined;
    // Date range: `days` = trailing window (7/30/90); converted to an ISO `since`.
    const days = parseInt(url.searchParams.get('days') || '', 10);
    const since = Number.isFinite(days) && days > 0
      ? new Date(Date.now() - days * 86400_000).toISOString()
      : undefined;

    // All orgs + their SBU ids + company names (for the filter + per-lead label).
    // Sourced from org_profiles ∪ users so leads still map to a company even when
    // the users table is sparse.
    const orgs = await orgLeadRoster();
    const companyBySbu = new Map(orgs.map((o) => [o.sbu, o.company]));
    const sbuByOrg = new Map(orgs.map((o) => [o.orgId, o.sbu]));

    const chosenSbu = orgFilter ? sbuByOrg.get(orgFilter) : undefined;
    // No org filter → scope to ALL org SBUs (not the whole crawler pool, which
    // may hold non-org/test signals). One org → just that org's SBU.
    const allOrgSbus = orgs.map((o) => o.sbu);

    const { signals, total } = await listSignals({
      sbu: chosenSbu,
      sbus: chosenSbu ? undefined : allOrgSbus,
      intentLevel,
      source,
      search,
      since,
      excludeNonProspects: true,
      deduplicateByPerson: true,
      orderBy: 'urgency_score',
      limit,
      offset: (page - 1) * limit,
    });

    const leads = signals.map((s) => ({
      ...toUiLead(s),
      company: (s.sbu_id && companyBySbu.get(s.sbu_id)) || '—',
      sbuId: s.sbu_id,
      location: s.location || null,
      urgency: s.urgency_score ?? null,
      summary: s.summary || null,
    }));

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      orgs: orgs.map((o) => ({ orgId: o.orgId, company: o.company })),
    });
  } catch (err) {
    console.error('[GET /api/super/leads]', err);
    return NextResponse.json({ message: 'Failed to load leads.' }, { status: 500 });
  }
}
