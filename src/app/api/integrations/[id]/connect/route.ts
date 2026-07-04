import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { isOAuthIntegration, signState, buildAuthorizeUrl } from '@/lib/integrations/oauth';
import { resolveCreds } from '@/lib/integrations/creds';
import { hasModule } from '@/lib/subscription/server-store';

export const dynamic = 'force-dynamic';

function originFor(req: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

/**
 * GET /api/integrations/:id/connect — returns the provider authorize URL, built
 * from THIS user's saved app credentials. Call with the Bearer token, then
 * redirect the browser to `url`.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  // CRM/integration access is a Pro+ feature — gated on the 'email' module
  // (same tier boundary as Email Desk, see TIER_MODULES in tiers.ts).
  if (!hasModule(user.sub, 'email')) {
    return NextResponse.json({ message: 'Integrations require an active Pro or Max subscription.' }, { status: 402 });
  }

  const id = params.id;
  if (!isOAuthIntegration(id)) {
    return NextResponse.json({ message: 'This integration does not support OAuth connect yet.' }, { status: 400 });
  }

  const creds = resolveCreds(user.sub, id);
  if (!creds) {
    return NextResponse.json({ message: 'Add your app credentials for this integration first.', needs_credentials: true }, { status: 428 });
  }

  const url = buildAuthorizeUrl(id, originFor(req), signState(user.sub, id), creds);
  if (!url) return NextResponse.json({ message: 'Could not build authorize URL.' }, { status: 500 });
  return NextResponse.json({ url });
}
