import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { createRule, listRules, updateRule, deleteRule, toggleRule } from '@/lib/leads/automation-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const rules = await listRules(user.org);
    return NextResponse.json({ rules });
  } catch (err) {
    console.error('[GET /api/automation/rules]', err);
    return NextResponse.json({ rules: [] });
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
    const { name, triggerType, triggerValue, actionType, actionValue } = body;

    if (!name?.trim() || !triggerType || !actionType || !actionValue) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const rule = await createRule(user.org, name, triggerType, triggerValue ?? null, actionType, actionValue);
    return NextResponse.json({ rule });
  } catch (err) {
    console.error('[POST /api/automation/rules]', err);
    return NextResponse.json({ message: 'Failed to create rule.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ message: 'Rule ID is required.' }, { status: 400 });
    }

    let rule;
    if (action === 'toggle') {
      rule = await toggleRule(user.org, id, updates.enabled ?? true);
    } else {
      rule = await updateRule(user.org, id, updates);
    }

    if (!rule) {
      return NextResponse.json({ message: 'Rule not found.' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (err) {
    console.error('[PATCH /api/automation/rules]', err);
    return NextResponse.json({ message: 'Failed to update rule.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: 'Rule ID is required.' }, { status: 400 });
    }

    const deleted = await deleteRule(user.org, id);
    if (!deleted) {
      return NextResponse.json({ message: 'Rule not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/automation/rules]', err);
    return NextResponse.json({ message: 'Failed to delete rule.' }, { status: 500 });
  }
}
