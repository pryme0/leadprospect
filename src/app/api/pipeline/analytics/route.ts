import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { getSignalsByIds } from '@/lib/crawler/signals-db';
import { listPipelineRows, type PipelineStage } from '@/lib/pipeline/store';

export const dynamic = 'force-dynamic';

interface SourceStats {
  source: string;
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  conversion_rate: number;
  total_value: number;
}

/**
 * GET /api/pipeline/analytics — conversion stats by signal source.
 * Shows which channels (TikTok, LinkedIn, etc.) perform best through the pipeline.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'This feature requires an active Lead Intelligence subscription.' }, { status: 403 });
  }

  try {
    const { sbu } = await resolveUserSbu(req);
    if (!sbu) return NextResponse.json({ sources: [] });

    const rows = await listPipelineRows(user.org, {});
    if (rows.length === 0) return NextResponse.json({ sources: [] });

    const signals = await getSignalsByIds(rows.map((r) => r.lead_id));
    const signalById = new Map(signals.map((s) => [s.id, s]));

    const bySource: Record<string, {
      stages: Record<PipelineStage, number>;
      value: number;
    }> = {};

    for (const row of rows) {
      const signal = signalById.get(row.lead_id);
      const source = signal?.source?.toLowerCase() || 'unknown';

      if (!bySource[source]) {
        bySource[source] = {
          stages: { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 },
          value: 0,
        };
      }

      bySource[source].stages[row.stage as PipelineStage]++;
      if (row.stage === 'won' && row.value) {
        bySource[source].value += Number(row.value) || 0;
      }
    }

    const sources: SourceStats[] = Object.entries(bySource)
      .map(([source, data]) => {
        const total = Object.values(data.stages).reduce((a, b) => a + b, 0);
        const won = data.stages.won;
        const closed = won + data.stages.lost;
        return {
          source,
          total,
          new: data.stages.new,
          contacted: data.stages.contacted,
          qualified: data.stages.qualified,
          won,
          lost: data.stages.lost,
          conversion_rate: closed > 0 ? Math.round((won / closed) * 100) : 0,
          total_value: data.value,
        };
      })
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ sources });
  } catch (err) {
    console.error('[GET /api/pipeline/analytics]', err);
    return NextResponse.json({ sources: [] });
  }
}
