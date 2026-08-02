import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getRecentActivity, getActivityForLead } from '@/lib/pipeline/store';
import { getSignalsByIds } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pipeline/activity — recent pipeline activity for the org.
 * Query: ?leadId=xxx for a specific lead, otherwise returns org-wide activity.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ activity: [] });
  }

  try {
    const leadId = req.nextUrl.searchParams.get('leadId');

    const rows = leadId
      ? await getActivityForLead(user.org, leadId, 20)
      : await getRecentActivity(user.org, 30);

    if (rows.length === 0) return NextResponse.json({ activity: [] });

    // Enrich with lead names
    const leadIds = Array.from(new Set(rows.map((r) => r.lead_id)));
    const signals = await getSignalsByIds(leadIds);
    const signalById = new Map(signals.map((s) => [s.id, s]));

    const activity = rows.map((row) => {
      const signal = signalById.get(row.lead_id);
      const lead = signal ? toUiLead(signal) : null;
      return {
        id: row.id,
        lead_id: row.lead_id,
        lead_name: lead?.first_name || signal?.username || 'Unknown',
        action: row.action,
        from_stage: row.from_stage,
        to_stage: row.to_stage,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ activity });
  } catch (err) {
    console.error('[GET /api/pipeline/activity]', err);
    return NextResponse.json({ activity: [] });
  }
}
