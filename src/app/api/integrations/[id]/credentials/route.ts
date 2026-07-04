import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { isOAuthIntegration, credentialFields } from '@/lib/integrations/oauth';
import { getCredentials, saveCredentials, deleteCredentials } from '@/lib/integrations/store';

export const dynamic = 'force-dynamic';

/** GET — the field definitions + whether this user has saved (masked) credentials. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const id = params.id;
  if (!isOAuthIntegration(id)) return NextResponse.json({ message: 'Not an OAuth integration.' }, { status: 400 });

  const c = getCredentials(user.sub, id);
  return NextResponse.json({
    fields: credentialFields(id),
    has_credentials: !!(c?.client_id && c.client_secret),
    client_id_masked: c?.client_id ? `${c.client_id.slice(0, 6)}…${c.client_id.slice(-4)}` : null,
    config: c?.config ?? {},
  });
}

/** POST — save this user's own app credentials (Consumer Key/Secret + config). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const id = params.id;
  if (!isOAuthIntegration(id)) return NextResponse.json({ message: 'Not an OAuth integration.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ message: 'Invalid body.' }, { status: 400 }); }

  const fields = credentialFields(id);
  const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';
  if (!clientId) return NextResponse.json({ message: 'Client ID / Consumer Key is required.' }, { status: 400 });

  const secretRaw = typeof body.client_secret === 'string' ? body.client_secret.trim() : '';
  const existing = getCredentials(user.sub, id);
  // Allow updating other fields without re-entering the secret (only saved if provided).
  if (!secretRaw && !existing?.client_secret) {
    return NextResponse.json({ message: 'Client Secret / Consumer Secret is required.' }, { status: 400 });
  }

  // Collect non-secret config fields (e.g. login_url) declared for this provider.
  const config: Record<string, string> = { ...(existing?.config ?? {}) };
  for (const f of fields) {
    if (f.key === 'client_id' || f.key === 'client_secret') continue;
    const v = body[f.key];
    if (typeof v === 'string') config[f.key] = v.trim();
  }

  saveCredentials(user.sub, id, { client_id: clientId, client_secret: secretRaw || null, config });
  return NextResponse.json({ ok: true });
}

/** DELETE — forget this user's app credentials for the integration. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  deleteCredentials(user.sub, params.id);
  return NextResponse.json({ ok: true });
}
