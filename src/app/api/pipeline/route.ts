import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { getSignalsByIds, getSignalById } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';
import {
  syncPipelineForOrg, listPipelineRows, upsertManualPipelineEntry,
  type PipelineStage,
} from '@/lib/pipeline/store';

export const dynamic = 'force-dynamic';

const STAGES: PipelineStage[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

/**
 * GET /api/pipeline — the logged-in org's sales pipeline (kanban data).
 * Self-heals on every call: syncs any new HIGH/MEDIUM-intent signal into 'new'
 * before reading, so the board is always current with no background job.
 * Query: stage, owner, q (search over the joined lead's name/content).
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'This feature requires an active Lead Intelligence subscription.' }, { status: 403 });
  }

  try {
    const { sbu } = await resolveUserSbu(req);
    if (!sbu) return NextResponse.json({ items: [], stagesCounts: {} });

    await syncPipelineForOrg(user.org, sbu);

    const sp = req.nextUrl.searchParams;
    const rawStage = sp.get('stage') || '';
    const stage = STAGES.includes(rawStage as PipelineStage) ? (rawStage as PipelineStage) : undefined;
    const owner = sp.get('owner') || undefined;
    const q = sp.get('q')?.trim().toLowerCase() || '';

    const rows = await listPipelineRows(user.org, { stage, ownerUserId: owner });
    const signals = await getSignalsByIds(rows.map((r) => r.lead_id));
    const signalById = new Map(signals.map((s) => [s.id, s]));

    let items = rows
      .filter((r) => signalById.has(r.lead_id)) // drop rows whose signal has since aged out
      .map((r) => {
        const signal = signalById.get(r.lead_id)!;
        return {
          ...toUiLead(signal),
          pipeline_id: r.id,
          stage: r.stage,
          value: r.value !== null ? Number(r.value) : null,
          owner_user_id: r.owner_user_id,
          notes: r.notes,
          lost_reason: r.lost_reason,
          follow_up_at: r.follow_up_at,
          stage_changed_at: r.stage_changed_at,
          created_at_pipeline: r.created_at,
        };
      });

    if (q) {
      items = items.filter((it) =>
        (it.first_name || '').toLowerCase().includes(q) ||
        (it.email || '').toLowerCase().includes(q) ||
        (it.summary || '').toLowerCase().includes(q) ||
        (it.post_content || '').toLowerCase().includes(q));
    }

    const stagesCounts: Record<string, number> = {};
    for (const s of STAGES) stagesCounts[s] = items.filter((it) => it.stage === s).length;

    return NextResponse.json({ items, stagesCounts, total: items.length });
  } catch (err) {
    console.error('[GET /api/pipeline]', err);
    return NextResponse.json({ message: 'Failed to load pipeline.' }, { status: 500 });
  }
}

/**
 * POST /api/pipeline — manually add a lead to the pipeline (e.g. a LOW-intent
 * signal the auto-entry rule skipped). Body: { leadId }.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'This feature requires an active Lead Intelligence subscription.' }, { status: 403 });
  }

  let body: { leadId?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }
  const leadId = String(body.leadId ?? '').trim();
  if (!leadId) return NextResponse.json({ message: 'leadId is required.' }, { status: 400 });

  const { sbu } = await resolveUserSbu(req);
  const signal = await getSignalById(leadId);
  if (!signal || !sbu || signal.sbu_id !== sbu) {
    return NextResponse.json({ message: 'Lead not found.' }, { status: 404 });
  }

  await upsertManualPipelineEntry(user.org, leadId);
  return NextResponse.json({ ok: true });
}
