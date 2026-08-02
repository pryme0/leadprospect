import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { listOAuthConnections, getOAuthConnection, deleteOAuthConnection } from '@/lib/integrations/oauth-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const provider = req.nextUrl.searchParams.get('provider');

    if (provider) {
      const connection = await getOAuthConnection(user.org, provider);
      if (!connection) {
        return NextResponse.json({ connected: false });
      }
      return NextResponse.json({
        connected: true,
        provider: connection.provider,
        account_name: connection.account_name,
        account_email: connection.account_email,
        connected_at: connection.created_at,
      });
    }

    const connections = await listOAuthConnections(user.org);
    return NextResponse.json({
      connections: connections.map((c) => ({
        provider: c.provider,
        account_name: c.account_name,
        account_email: c.account_email,
        connected_at: c.created_at,
      })),
    });
  } catch (err) {
    console.error('[GET /api/integrations/oauth/connections]', err);
    return NextResponse.json({ connections: [] });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const provider = req.nextUrl.searchParams.get('provider');
    if (!provider) {
      return NextResponse.json({ message: 'Provider required.' }, { status: 400 });
    }

    const deleted = await deleteOAuthConnection(user.org, provider);
    if (!deleted) {
      return NextResponse.json({ message: 'Connection not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/integrations/oauth/connections]', err);
    return NextResponse.json({ message: 'Failed to disconnect.' }, { status: 500 });
  }
}
