import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { generateState, saveOAuthState } from '@/lib/integrations/oauth-store';
import { getHubSpotAuthUrl } from '@/lib/integrations/providers/hubspot';
import { getPipedriveAuthUrl } from '@/lib/integrations/providers/pipedrive';
import { getGoogleAuthUrl } from '@/lib/integrations/providers/google';

export const dynamic = 'force-dynamic';

const PROVIDERS: Record<string, (state: string) => string> = {
  hubspot: getHubSpotAuthUrl,
  pipedrive: getPipedriveAuthUrl,
  google: getGoogleAuthUrl,
};

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const provider = req.nextUrl.searchParams.get('provider');
  const redirect = req.nextUrl.searchParams.get('redirect') ?? '/admin/integrations';

  if (!provider || !PROVIDERS[provider]) {
    return NextResponse.json({ message: 'Invalid provider.' }, { status: 400 });
  }

  const state = generateState();
  await saveOAuthState(state, user.org, provider, redirect);

  const authUrl = PROVIDERS[provider](state);
  return NextResponse.redirect(authUrl);
}
