import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import {
  createWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  regenerateSecret,
  getWebhookLogs,
  WEBHOOK_EVENTS,
} from '@/lib/integrations/webhooks-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const webhookId = req.nextUrl.searchParams.get('webhookId');

    if (webhookId) {
      const logs = await getWebhookLogs(webhookId);
      return NextResponse.json({ logs });
    }

    const webhooks = await listWebhooks(user.org);
    return NextResponse.json({ webhooks, events: WEBHOOK_EVENTS });
  } catch (err) {
    console.error('[GET /api/integrations/webhooks]', err);
    return NextResponse.json({ webhooks: [], events: WEBHOOK_EVENTS });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, url, events } = body;

    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json({ message: 'Name and URL are required.' }, { status: 400 });
    }

    if (!url.startsWith('https://')) {
      return NextResponse.json({ message: 'Webhook URL must use HTTPS.' }, { status: 400 });
    }

    const webhook = await createWebhook(user.org, name, url, events ?? []);
    return NextResponse.json({ webhook });
  } catch (err) {
    console.error('[POST /api/integrations/webhooks]', err);
    return NextResponse.json({ message: 'Failed to create webhook.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ message: 'Webhook ID is required.' }, { status: 400 });
    }

    if (action === 'regenerate_secret') {
      const secret = await regenerateSecret(user.org, id);
      if (!secret) {
        return NextResponse.json({ message: 'Webhook not found.' }, { status: 404 });
      }
      return NextResponse.json({ secret });
    }

    const webhook = await updateWebhook(user.org, id, updates);
    if (!webhook) {
      return NextResponse.json({ message: 'Webhook not found.' }, { status: 404 });
    }

    return NextResponse.json({ webhook });
  } catch (err) {
    console.error('[PATCH /api/integrations/webhooks]', err);
    return NextResponse.json({ message: 'Failed to update webhook.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: 'Webhook ID is required.' }, { status: 400 });
    }

    const deleted = await deleteWebhook(user.org, id);
    if (!deleted) {
      return NextResponse.json({ message: 'Webhook not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/integrations/webhooks]', err);
    return NextResponse.json({ message: 'Failed to delete webhook.' }, { status: 500 });
  }
}
