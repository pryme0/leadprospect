import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getSignalsByIds } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';
import { listPipelineRows } from '@/lib/pipeline/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pipeline/reminders — overdue follow-ups for the notification bell.
 * Returns pipeline items where follow_up_at < now and stage is not won/lost.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ reminders: [] });
  }

  try {
    const rows = await listPipelineRows(user.org, {});
    const now = Date.now();

    const overdueRows = rows.filter((r) => {
      if (!r.follow_up_at) return false;
      if (r.stage === 'won' || r.stage === 'lost') return false;
      return new Date(r.follow_up_at).getTime() < now;
    });

    if (overdueRows.length === 0) {
      return NextResponse.json({ reminders: [] });
    }

    const signals = await getSignalsByIds(overdueRows.map((r) => r.lead_id));
    const signalById = new Map(signals.map((s) => [s.id, s]));

    const reminders = overdueRows
      .filter((r) => signalById.has(r.lead_id))
      .map((r) => {
        const signal = signalById.get(r.lead_id)!;
        const lead = toUiLead(signal);
        const daysOverdue = Math.floor((now - new Date(r.follow_up_at!).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: r.id,
          lead_id: r.lead_id,
          name: lead.first_name || signal.username || 'Unknown',
          stage: r.stage,
          follow_up_at: r.follow_up_at,
          days_overdue: daysOverdue,
        };
      })
      .sort((a, b) => b.days_overdue - a.days_overdue);

    return NextResponse.json({ reminders });
  } catch (err) {
    console.error('[pipeline/reminders] Error:', err);
    return NextResponse.json({ reminders: [] });
  }
}
