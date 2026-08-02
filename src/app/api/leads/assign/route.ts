import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { assignLead, unassignLead, getAssignmentsForLeads, getAssignmentStats } from '@/lib/leads/assignment-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const leadIds = req.nextUrl.searchParams.get('leadIds');

    if (leadIds) {
      const ids = leadIds.split(',').filter(Boolean);
      const assignments = await getAssignmentsForLeads(user.org, ids);
      return NextResponse.json({ assignments });
    }

    const stats = await getAssignmentStats(user.org);
    return NextResponse.json({ stats });
  } catch (err) {
    console.error('[GET /api/leads/assign]', err);
    return NextResponse.json({ assignments: {}, stats: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'leads'))) {
    return NextResponse.json({ message: 'Leads module not enabled.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { leadId, leadIds, userId, action } = body;

    if (action === 'unassign') {
      const ids = leadIds ?? (leadId ? [leadId] : []);
      for (const id of ids) {
        await unassignLead(user.org, id);
      }
      return NextResponse.json({ success: true, unassigned: ids.length });
    }

    if (!userId) {
      return NextResponse.json({ message: 'userId is required.' }, { status: 400 });
    }

    const ids = leadIds ?? (leadId ? [leadId] : []);
    if (ids.length === 0) {
      return NextResponse.json({ message: 'leadId or leadIds required.' }, { status: 400 });
    }

    const assignments = [];
    for (const id of ids) {
      const assignment = await assignLead(user.org, id, userId, user.sub);
      assignments.push(assignment);
    }

    return NextResponse.json({ success: true, assignments, assigned: ids.length });
  } catch (err) {
    console.error('[POST /api/leads/assign]', err);
    return NextResponse.json({ message: 'Assignment failed.' }, { status: 500 });
  }
}
