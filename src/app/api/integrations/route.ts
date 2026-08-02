import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import {
  upsertIntegration,
  listIntegrations,
  getIntegration,
  toggleIntegration,
  deleteIntegration,
  INTEGRATION_SCHEMAS,
  IntegrationType,
} from '@/lib/integrations/integrations-store';

export const dynamic = 'force-dynamic';

const VALID_TYPES = Object.keys(INTEGRATION_SCHEMAS) as IntegrationType[];

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const type = req.nextUrl.searchParams.get('type') as IntegrationType | null;

    if (type && VALID_TYPES.includes(type)) {
      const integration = await getIntegration(user.org, type);
      const schema = INTEGRATION_SCHEMAS[type];
      return NextResponse.json({ integration, schema });
    }

    const integrations = await listIntegrations(user.org);
    return NextResponse.json({
      integrations,
      available: VALID_TYPES.map((t) => ({
        type: t,
        name: t.replace(/_/g, ' ').split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        configured: integrations.some((i) => i.type === t),
        enabled: integrations.find((i) => i.type === t)?.enabled ?? false,
      })),
      schemas: INTEGRATION_SCHEMAS,
    });
  } catch (err) {
    console.error('[GET /api/integrations]', err);
    return NextResponse.json({ integrations: [], available: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const { type, name, config } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ message: 'Invalid integration type.' }, { status: 400 });
    }

    const schema = INTEGRATION_SCHEMAS[type as IntegrationType];
    for (const field of schema.fields) {
      if (field.required && !config?.[field.key]) {
        return NextResponse.json({ message: `${field.label} is required.` }, { status: 400 });
      }
    }

    const integration = await upsertIntegration(
      user.org,
      type as IntegrationType,
      name || type.replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      config ?? {},
    );

    return NextResponse.json({ integration });
  } catch (err) {
    console.error('[POST /api/integrations]', err);
    return NextResponse.json({ message: 'Failed to save integration.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const { type, action, enabled } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ message: 'Invalid integration type.' }, { status: 400 });
    }

    if (action === 'toggle') {
      const integration = await toggleIntegration(user.org, type as IntegrationType, enabled ?? false);
      if (!integration) {
        return NextResponse.json({ message: 'Integration not found.' }, { status: 404 });
      }
      return NextResponse.json({ integration });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    console.error('[PATCH /api/integrations]', err);
    return NextResponse.json({ message: 'Failed to update integration.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const type = req.nextUrl.searchParams.get('type') as IntegrationType | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ message: 'Invalid integration type.' }, { status: 400 });
    }

    const deleted = await deleteIntegration(user.org, type);
    if (!deleted) {
      return NextResponse.json({ message: 'Integration not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/integrations]', err);
    return NextResponse.json({ message: 'Failed to delete integration.' }, { status: 500 });
  }
}
