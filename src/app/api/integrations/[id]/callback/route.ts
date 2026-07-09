import { NextResponse } from 'next/server';
import { verifyState, exchangeCode } from '@/lib/integrations/oauth';
import { resolveCreds } from '@/lib/integrations/creds';
import { upsertConnection } from '@/lib/integrations/store';
import { fetchSalesforceIdentity } from '@/lib/integrations/salesforce';

export const dynamic = 'force-dynamic';

function originFor(req: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

/**
 * GET /api/integrations/:id/callback — provider OAuth redirect target.
 * Verifies the signed state (→ user id), exchanges the code for tokens, stores
 * them per-user, and bounces back to /admin/integrations.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const origin = originFor(req);
  const sp = new URL(req.url).searchParams;
  const back = (q: string) => NextResponse.redirect(`${origin}/admin/integrations?${q}`);

  const providerError = sp.get('error') || sp.get('error_description');
  if (providerError) return back(`error=${encodeURIComponent(providerError)}`);

  const code = sp.get('code');
  const st = sp.get('state') ? verifyState(sp.get('state')!) : null;
  if (!code || !st || st.integration !== id) return back('error=invalid_state');

  const creds = await resolveCreds(st.sub, id);
  if (!creds) return back('error=missing_credentials');

  try {
    const t = await exchangeCode(id, origin, code, creds);

    let account_label: string | null = null;
    if (id === 'salesforce' && t.id && t.access_token) {
      account_label = await fetchSalesforceIdentity(t.access_token, t.id);
    }

    upsertConnection(st.sub, id, {
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      instance_url: t.instance_url ?? null,
      account_label,
      scopes: typeof t.scope === 'string' ? t.scope : null,
      extra: t.id ? { identity_url: t.id } : {},
    });

    return back(`connected=${encodeURIComponent(id)}`);
  } catch (err) {
    console.error(`[integrations callback ${id}]`, err);
    return back(`error=${encodeURIComponent('connection_failed')}`);
  }
}
