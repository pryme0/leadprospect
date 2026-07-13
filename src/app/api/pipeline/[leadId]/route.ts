import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getPipelineRow, updatePipelineRow, type PipelineStage } from '@/lib/pipeline/store';

export const dynamic = 'force-dynamic';

const STAGES: PipelineStage[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

/**
 * PATCH /api/pipeline/[leadId] — update a pipeline row's stage/value/notes/
 * owner/follow_up_at. Moving to 'lost' requires a lost_reason. Org-scoped
 * WHERE clause (inside updatePipelineRow) is the security boundary — a lead
 * outside the caller's org simply won't match and 404s.
 */
export async function PATCH(req: NextRequest, { params }: { params: { leadId: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'This feature requires an active Lead Intelligence subscription.' }, { status: 403 });
  }

  const leadId = params.leadId;
  const existing = await getPipelineRow(user.org, leadId);
  if (!existing) return NextResponse.json({ message: 'Pipeline entry not found.' }, { status: 404 });

  let body: {
    stage?: string; value?: number | null; owner_user_id?: string | null;
    notes?: string | null; lost_reason?: string | null; follow_up_at?: string | null;
  } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const input: Parameters<typeof updatePipelineRow>[2] = {};

  if (body.stage !== undefined) {
    if (!STAGES.includes(body.stage as PipelineStage)) {
      return NextResponse.json({ message: `stage must be one of ${STAGES.join(', ')}.` }, { status: 400 });
    }
    if (body.stage === 'lost' && !body.lost_reason && !existing.lost_reason) {
      return NextResponse.json({ message: 'lost_reason is required when moving a lead to Lost.' }, { status: 400 });
    }
    input.stage = body.stage as PipelineStage;
  }
  if (body.value !== undefined) {
    if (body.value !== null && (typeof body.value !== 'number' || Number.isNaN(body.value))) {
      return NextResponse.json({ message: 'value must be a number or null.' }, { status: 400 });
    }
    input.value = body.value;
  }
  if (body.owner_user_id !== undefined) input.owner_user_id = body.owner_user_id;
  if (body.notes !== undefined) input.notes = body.notes;
  if (body.lost_reason !== undefined) input.lost_reason = body.lost_reason;
  if (body.follow_up_at !== undefined) input.follow_up_at = body.follow_up_at;

  const updated = await updatePipelineRow(user.org, leadId, input);
  return NextResponse.json({ ok: true, item: updated });
}
