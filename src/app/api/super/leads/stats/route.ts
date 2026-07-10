import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { getSignalsPool } from '@/lib/crawler/signals-db';
import { orgLeadRoster } from '@/lib/super/orgs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/super/leads/stats — platform-wide lead analytics across all org SBUs
 * (or one, via ?org). KPIs + chart series for the super-admin Leads page.
 * Filters (mirror /api/super/leads): org, intent_level, source, q, days.
 */
function emptyStats() {
  return {
    kpis: { total: 0, high: 0, medium: 0, low: 0, withEmail: 0, withPhone: 0, avgUrgency: 0, thisWeek: 0, wowPct: 0 },
    byDay: [] as { date: string; count: number }[],
    bySource: [] as { source: string; count: number }[],
    byIntent: [] as { intent_level: string; count: number }[],
    topOrgs: [] as { company: string; count: number }[],
    sources: [] as string[],
  };
}

export async function GET(req: Request) {
  const auth = requireSuperAdmin(req);
  if ('error' in auth) return auth.error;

  try {
    const pool = getSignalsPool();
    if (!pool) return NextResponse.json(emptyStats());

    const url = new URL(req.url);
    const orgFilter = url.searchParams.get('org') || '';
    const intent = url.searchParams.get('intent_level') || '';
    const source = url.searchParams.get('source') || '';
    const search = url.searchParams.get('q')?.trim() || '';
    const daysRaw = parseInt(url.searchParams.get('days') || '', 10);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 0;

    // org → sbu + company (same mapping as the leads list route)
    const orgs = await orgLeadRoster();
    const companyBySbu = new Map(orgs.map((o) => [o.sbu, o.company]));
    const sbuByOrg = new Map(orgs.map((o) => [o.orgId, o.sbu]));
    const scopeSbus = orgFilter
      ? ([sbuByOrg.get(orgFilter)].filter(Boolean) as string[])
      : orgs.map((o) => o.sbu);
    if (scopeSbus.length === 0) return NextResponse.json(emptyStats());

    // Shared WHERE (parameterized). $1 is always the SBU scope array.
    const params: unknown[] = [scopeSbus];
    const clauses = ['sbu_id = ANY($1)', "COALESCE(intent_category, '') <> 'Not a Prospect'"];
    if (intent) { params.push(intent); clauses.push(`intent_level = $${params.length}`); }
    if (source) { params.push(source); clauses.push(`source = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`); const n = params.length;
      clauses.push(`(content ILIKE $${n} OR name ILIKE $${n} OR enriched_name ILIKE $${n} OR enriched_email ILIKE $${n})`);
    }
    if (days) { params.push(new Date(Date.now() - days * 86400_000).toISOString()); clauses.push(`created_at >= $${params.length}`); }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const windowDays = days || 30;

    const [totals, wow, byDay, bySource, byIntent, topOrgs] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE intent_level = 'HIGH_INTENT')::int AS high,
          COUNT(*) FILTER (WHERE intent_level = 'MEDIUM_INTENT')::int AS medium,
          COUNT(*) FILTER (WHERE intent_level = 'LOW_INTENT')::int AS low,
          COUNT(*) FILTER (WHERE enriched_email IS NOT NULL AND enriched_email <> '' AND enriched_email NOT LIKE '%@null%')::int AS with_email,
          COUNT(*) FILTER (WHERE (enriched_phone IS NOT NULL AND enriched_phone <> '') OR (phone IS NOT NULL AND phone <> ''))::int AS with_phone,
          COALESCE(ROUND(AVG(urgency_score) FILTER (WHERE urgency_score IS NOT NULL))::int, 0) AS avg_urgency
        FROM signals ${where}`, params),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS this_week,
          COUNT(*) FILTER (WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days')::int AS prev_week
        FROM signals ${where}`, params),
      pool.query(`
        SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM signals ${where} AND created_at >= now() - interval '${windowDays} days'
        GROUP BY created_at::date ORDER BY created_at::date`, params),
      pool.query(`SELECT source, COUNT(*)::int AS count FROM signals ${where} GROUP BY source ORDER BY count DESC LIMIT 6`, params),
      pool.query(`SELECT intent_level, COUNT(*)::int AS count FROM signals ${where} GROUP BY intent_level`, params),
      pool.query(`SELECT sbu_id, COUNT(*)::int AS count FROM signals ${where} GROUP BY sbu_id ORDER BY count DESC LIMIT 8`, params),
    ]);

    const t = totals.rows[0] ?? {};
    const w = wow.rows[0] ?? {};
    const thisWeek = w.this_week ?? 0;
    const prevWeek = w.prev_week ?? 0;
    const wowPct = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : (thisWeek > 0 ? 100 : 0);

    return NextResponse.json({
      kpis: {
        total: t.total ?? 0, high: t.high ?? 0, medium: t.medium ?? 0, low: t.low ?? 0,
        withEmail: t.with_email ?? 0, withPhone: t.with_phone ?? 0, avgUrgency: t.avg_urgency ?? 0,
        thisWeek, wowPct,
      },
      byDay: byDay.rows as { date: string; count: number }[],
      bySource: (bySource.rows as { source: string; count: number }[]).filter((r) => r.source),
      byIntent: byIntent.rows as { intent_level: string; count: number }[],
      topOrgs: (topOrgs.rows as { sbu_id: string; count: number }[]).map((r) => ({
        company: companyBySbu.get(r.sbu_id) || r.sbu_id, count: r.count,
      })),
      sources: (bySource.rows as { source: string }[]).map((r) => r.source).filter(Boolean),
    });
  } catch (err) {
    console.error('[GET /api/super/leads/stats]', err);
    return NextResponse.json(emptyStats(), { status: 200 });
  }
}
