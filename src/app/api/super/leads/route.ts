import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { listSignals, type SignalQuery } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';
import { listOrgOwners } from '@/lib/auth/db';
import { sbuIdForUser } from '@/lib/crawler/control-client';
import { getOrgProfile } from '@/lib/settings/org-store';

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

    // All orgs + their SBU ids + company names (for the filter + per-lead label).
    // Prefer the stored crawler_sbu_id (what resolveUserSbu uses) so leads map
    // to their org; fall back to the deterministic id.
    const owners = await listOrgOwners();
    const orgs = await Promise.all(owners.map(async (o) => {
      const profile = await getOrgProfile(o.id);
      return {
        orgId: o.id,
        company: profile?.company_name || o.name || o.email,
        sbu: profile?.crawler_sbu_id || sbuIdForUser(o.id),
      };
    }));
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
