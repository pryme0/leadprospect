import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { listSignals } from '@/lib/crawler/signals-db';
import { listPipelineRows, getPipelineStats } from '@/lib/pipeline/store';
import { getRecentActivity } from '@/lib/pipeline/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  const { sbu } = await resolveUserSbu(req);
  if (!sbu) return NextResponse.json({ message: 'No SBU configured.' }, { status: 400 });

  try {
    const [signalsResult, pipelineRows, pipelineStats, recentActivity] = await Promise.all([
      listSignals({ sbu, limit: 1000 }),
      listPipelineRows(user.org),
      getPipelineStats(user.org),
      getRecentActivity(user.org, 10),
    ]);

    const signals = signalsResult.signals;

    // Leads by intent level
    const intentBreakdown: Record<string, number> = {};
    for (const s of signals) {
      const intent = s.intent_level ?? 'unknown';
      intentBreakdown[intent] = (intentBreakdown[intent] ?? 0) + 1;
    }

    // Leads by source/platform
    const sourceBreakdown: Record<string, number> = {};
    for (const s of signals) {
      const source = s.source ?? 'unknown';
      sourceBreakdown[source] = (sourceBreakdown[source] ?? 0) + 1;
    }

    // Leads by day (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const leadsByDay: Record<string, number> = {};
    for (const s of signals) {
      const created = new Date(s.created_at);
      if (created >= thirtyDaysAgo) {
        const day = created.toISOString().slice(0, 10);
        leadsByDay[day] = (leadsByDay[day] ?? 0) + 1;
      }
    }

    // Pipeline by stage over time (simplified: current counts)
    const pipelineByStage = pipelineStats.counts;

    // Conversion funnel: new → contacted → qualified → won
    const funnel = [
      { stage: 'new', count: pipelineStats.counts.new, pct: 100 },
      { stage: 'contacted', count: pipelineStats.counts.contacted, pct: 0 },
      { stage: 'qualified', count: pipelineStats.counts.qualified, pct: 0 },
      { stage: 'won', count: pipelineStats.counts.won, pct: 0 },
    ];
    const totalStarted = pipelineStats.counts.new + pipelineStats.counts.contacted + pipelineStats.counts.qualified + pipelineStats.counts.won + pipelineStats.counts.lost;
    if (totalStarted > 0) {
      funnel[1].pct = Math.round(((funnel[1].count + funnel[2].count + funnel[3].count) / totalStarted) * 100);
      funnel[2].pct = Math.round(((funnel[2].count + funnel[3].count) / totalStarted) * 100);
      funnel[3].pct = Math.round((funnel[3].count / totalStarted) * 100);
    }

    // Source performance (leads to won)
    const sourceToWon: Record<string, { leads: number; won: number }> = {};
    for (const s of signals) {
      const source = s.source ?? 'unknown';
      if (!sourceToWon[source]) sourceToWon[source] = { leads: 0, won: 0 };
      sourceToWon[source].leads++;
    }
    const wonLeadIds = new Set(pipelineRows.filter((r) => r.stage === 'won').map((r) => r.lead_id));
    for (const s of signals) {
      if (wonLeadIds.has(s.id)) {
        const source = s.source ?? 'unknown';
        if (sourceToWon[source]) sourceToWon[source].won++;
      }
    }
    const sourcePerformance = Object.entries(sourceToWon)
      .map(([source, data]) => ({
        source,
        leads: data.leads,
        won: data.won,
        rate: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0,
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalLeads: signals.length,
        inPipeline: pipelineRows.length,
        winRate: pipelineStats.winRate,
        wonValue: pipelineStats.wonValue,
        openValue: pipelineStats.openValue,
        avgCycleDays: pipelineStats.avgCycleDays,
      },
      intentBreakdown,
      sourceBreakdown,
      leadsByDay,
      pipelineByStage,
      funnel,
      sourcePerformance,
      recentActivity: recentActivity.slice(0, 5),
    });
  } catch (err) {
    console.error('[GET /api/dashboard/analytics]', err);
    return NextResponse.json({ message: 'Analytics failed.' }, { status: 500 });
  }
}
