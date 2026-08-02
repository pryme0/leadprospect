import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getPipelineRow, updatePipelineRow } from '@/lib/pipeline/store';
import { getNotesForLead, addNote } from '@/lib/leads/notes-store';
import { getTagsForLead, assignTag } from '@/lib/leads/tags-store';
import { appPool } from '@/lib/app-pg';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { primaryId, mergeIds } = body;

    if (!primaryId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return NextResponse.json({ message: 'primaryId and mergeIds[] are required.' }, { status: 400 });
    }

    const allMergeIds = mergeIds.filter((id: string) => id !== primaryId);
    if (allMergeIds.length === 0) {
      return NextResponse.json({ message: 'No leads to merge.' }, { status: 400 });
    }

    // Get primary pipeline row to check if it exists
    const primaryPipeline = await getPipelineRow(user.org, primaryId);

    // Merge pipeline data: keep the most advanced stage, sum values
    let bestStage = primaryPipeline?.stage ?? 'new';
    let totalValue = primaryPipeline?.value ?? 0;
    const stageOrder = ['lost', 'new', 'contacted', 'qualified', 'won'];

    for (const mergeId of allMergeIds) {
      const mergePipeline = await getPipelineRow(user.org, mergeId);
      if (mergePipeline) {
        if (stageOrder.indexOf(mergePipeline.stage) > stageOrder.indexOf(bestStage)) {
          bestStage = mergePipeline.stage;
        }
        totalValue += mergePipeline.value ?? 0;
      }
    }

    // Update primary with merged pipeline data
    if (primaryPipeline) {
      await updatePipelineRow(user.org, primaryId, {
        stage: bestStage,
        value: totalValue > 0 ? totalValue : null,
      });
    }

    // Merge notes: copy all notes from merged leads to primary
    for (const mergeId of allMergeIds) {
      const notes = await getNotesForLead(user.org, mergeId);
      for (const note of notes) {
        await addNote(user.org, primaryId, note.user_id, `[Merged from ${mergeId}] ${note.content}`);
      }
    }

    // Merge tags: assign all tags from merged leads to primary
    for (const mergeId of allMergeIds) {
      const tags = await getTagsForLead(user.org, mergeId);
      for (const tag of tags) {
        await assignTag(user.org, primaryId, tag.id);
      }
    }

    // Delete merged leads from pipeline
    await appPool().query(
      `DELETE FROM lead_pipeline WHERE org_id = $1 AND lead_id = ANY($2)`,
      [user.org, allMergeIds],
    );

    // Delete merged leads' notes
    await appPool().query(
      `DELETE FROM lead_notes WHERE org_id = $1 AND lead_id = ANY($2)`,
      [user.org, allMergeIds],
    );

    // Delete merged leads' tag assignments
    await appPool().query(
      `DELETE FROM lead_tag_assignments WHERE org_id = $1 AND lead_id = ANY($2)`,
      [user.org, allMergeIds],
    );

    return NextResponse.json({
      success: true,
      primaryId,
      merged: allMergeIds.length,
      message: `Merged ${allMergeIds.length} lead(s) into primary.`,
    });
  } catch (err) {
    console.error('[POST /api/leads/merge]', err);
    return NextResponse.json({ message: 'Merge failed.' }, { status: 500 });
  }
}
