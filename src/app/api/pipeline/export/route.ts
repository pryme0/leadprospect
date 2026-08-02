import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { listPipelineRows } from '@/lib/pipeline/store';
import { getSignalsByIds } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';

export const dynamic = 'force-dynamic';

function escapeCSV(val: string | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const rows = await listPipelineRows(user.org);
    if (rows.length === 0) {
      return new NextResponse('No pipeline data.', { status: 200 });
    }

    const leadIds = rows.map((r) => r.lead_id);
    const signals = await getSignalsByIds(leadIds);
    const signalById = new Map(signals.map((s) => [s.id, s]));

    const headers = [
      'Lead ID', 'Name', 'Username', 'Source', 'Email',
      'Stage', 'Value', 'Notes', 'Lost Reason', 'Follow-up Date',
      'Stage Changed At', 'Created At'
    ];

    const csvRows = rows.map((row) => {
      const signal = signalById.get(row.lead_id);
      const lead = signal ? toUiLead(signal) : null;
      return [
        row.lead_id,
        lead?.first_name ?? '',
        lead?.username ?? '',
        lead?.source ?? '',
        lead?.email ?? '',
        row.stage,
        row.value ?? '',
        row.notes ?? '',
        row.lost_reason ?? '',
        row.follow_up_at ?? '',
        row.stage_changed_at,
        row.created_at,
      ].map((v) => escapeCSV(String(v ?? ''))).join(',');
    });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const filename = `pipeline-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/pipeline/export]', err);
    return NextResponse.json({ message: 'Export failed.' }, { status: 500 });
  }
}
