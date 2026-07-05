import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/comms/db';
import { getUserFromRequest } from '@/lib/auth/session';
import { checkConnectedAccountCap } from '@/lib/subscription/limits';

/* Unipile provider names — only these are supported by their hosted auth */
const UNIPILE_PROVIDERS: Record<string, string> = {
  instagram: 'INSTAGRAM',
  x:         'TWITTER',
  linkedin:  'LINKEDIN',
  whatsapp:  'WHATSAPP',
  messenger: 'MESSENGER',
  telegram:  'TELEGRAM',
  gmail:     'GOOGLE',
  outlook:   'OUTLOOK',
  /* Note: FACEBOOK and SLACK are handled differently by Unipile (not in hosted auth) */
  facebook:  'MESSENGER',   // Facebook page messages go through Messenger provider
  slack:     'MAIL',        // Fallback — Slack uses token auth in practice
};

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get('channel');

  if (!channelId) {
    return NextResponse.json({ error: 'channel param is required' }, { status: 400 });
  }

  const provider = UNIPILE_PROVIDERS[channelId];
  if (!provider) {
    return NextResponse.json({ error: 'Channel does not use Unipile hosted auth' }, { status: 400 });
  }

  // Connected-account cap — checked here (before opening Unipile's hosted-auth
  // popup) because a real Unipile connection completes on Unipile's own domain;
  // by the time our GET /api/comms/channels syncs it back, it already exists.
  const cap = await checkConnectedAccountCap(getDb(), user.sub, channelId);
  if (!cap.ok) {
    return NextResponse.json({ error: cap.message, code: 'account_limit' }, { status: 402 });
  }

  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn    = process.env.UNIPILE_DSN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  /* Demo mode — env not yet configured */
  if (!apiKey || !dsn) {
    return NextResponse.json({ demo: true });
  }

  /* expiresOn: 24 h from now (Unipile resets links on daily restart anyway) */
  const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z');

  try {
    const res = await fetch(`${dsn}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
        'accept': 'application/json',
      },
      body: JSON.stringify({
        type: 'create',
        providers: [provider],
        api_url: dsn,
        expiresOn,
        name: `comms_${channelId}_${Date.now()}`,
        success_redirect_url: `${appUrl}/admin/comms?connected=${channelId}`,
        failure_redirect_url: `${appUrl}/admin/comms?error=${channelId}`,
      }),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      console.error('[Unipile oauth-link error]', res.status, JSON.stringify(data));
      return NextResponse.json({ error: 'Failed to generate authorization link', detail: data }, { status: 502 });
    }

    /* Unipile returns { object: "HostedAuthLink", url: "https://..." } */
    const url = (data.url ?? data.hosted_url) as string | undefined;
    if (!url) {
      return NextResponse.json({ error: 'No URL in Unipile response', data }, { status: 502 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[GET /api/comms/channels/oauth-link]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
