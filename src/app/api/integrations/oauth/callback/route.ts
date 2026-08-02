import { NextRequest, NextResponse } from 'next/server';
import { consumeOAuthState, upsertOAuthConnection } from '@/lib/integrations/oauth-store';
import { exchangeHubSpotCode } from '@/lib/integrations/providers/hubspot';
import { exchangePipedriveCode } from '@/lib/integrations/providers/pipedrive';
import { exchangeGoogleCode, getGoogleUserInfo } from '@/lib/integrations/providers/google';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/admin/integrations?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/admin/integrations?error=missing_params', req.url));
  }

  const stateData = await consumeOAuthState(state);
  if (!stateData) {
    return NextResponse.redirect(new URL('/admin/integrations?error=invalid_state', req.url));
  }

  const { org_id, provider, redirect } = stateData;

  try {
    let account: { id?: string; name?: string; email?: string } = {};
    let rawData: Record<string, unknown> = {};

    switch (provider) {
      case 'hubspot': {
        const tokens = await exchangeHubSpotCode(code);
        await upsertOAuthConnection(org_id, 'hubspot', tokens, account, rawData);
        break;
      }

      case 'pipedrive': {
        const tokens = await exchangePipedriveCode(code);
        rawData = { api_domain: tokens.api_domain };
        await upsertOAuthConnection(org_id, 'pipedrive', tokens, account, rawData);
        break;
      }

      case 'google': {
        const tokens = await exchangeGoogleCode(code);
        const userInfo = await getGoogleUserInfo(tokens.access_token);
        if (userInfo) {
          account = { id: userInfo.id, name: userInfo.name, email: userInfo.email };
        }
        await upsertOAuthConnection(org_id, 'google', tokens, account, rawData);
        break;
      }

      default:
        return NextResponse.redirect(new URL('/admin/integrations?error=unknown_provider', req.url));
    }

    const successUrl = new URL(redirect ?? '/admin/integrations', req.url);
    successUrl.searchParams.set('connected', provider);
    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error(`[OAuth callback ${provider}]`, err);
    return NextResponse.redirect(new URL(`/admin/integrations?error=exchange_failed&provider=${provider}`, req.url));
  }
}
