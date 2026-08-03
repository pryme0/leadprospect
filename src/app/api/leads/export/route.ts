import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { listSignals } from '@/lib/crawler/signals-db';
import { toUiLead, toUiLeadFromImported } from '@/lib/crawler/map';
import { getPipelineStagesByLeadIds } from '@/lib/pipeline/store';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { getMergedLeadIds } from '@/lib/leads/merges-store';
import { listImportedLeads } from '@/lib/leads/imported-store';
import { getTagsForLeads } from '@/lib/leads/tags-store';

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

  const { sbu } = await resolveUserSbu(req);
  if (!sbu) return NextResponse.json({ message: 'No SBU configured.' }, { status: 400 });

  try {
    const { signals } = await listSignals({ sbu, limit: 5000 });
    const imported = await listImportedLeads(user.org).catch(() => []);
    let leads = [...imported.map(toUiLeadFromImported), ...signals.map(toUiLead)];

    const merged = await getMergedLeadIds(user.org).catch(() => new Set<string>());
    if (merged.size > 0) leads = leads.filter((l) => !merged.has(l.id));

    const leadIds = leads.map((l) => l.id);
    const pipelineData = await getPipelineStagesByLeadIds(user.org, leadIds);
    const tagsData = await getTagsForLeads(user.org, leadIds);

    const headers = [
      'ID', 'Name', 'Username', 'Platform', 'Email', 'Phone',
      'Intent Level', 'Source', 'Pipeline Stage', 'Follow-up Date', 'Tags', 'Created At'
    ];

    const rows = leads.map((lead) => {
      const pipe = pipelineData[lead.id];
      const tags = (tagsData[lead.id] ?? []).map((t) => t.name).join('; ');
      return [
        lead.id,
        lead.first_name || '',
        lead.username ?? '',
        lead.source ?? '',
        lead.email ?? '',
        lead.phone_number ?? '',
        lead.intent_level ?? '',
        lead.source_tool ?? '',
        pipe?.stage ?? '',
        pipe?.follow_up_at ?? '',
        tags,
        lead.created_at ?? '',
      ].map((v) => escapeCSV(String(v ?? ''))).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/leads/export]', err);
    return NextResponse.json({ message: 'Export failed.' }, { status: 500 });
  }
}
