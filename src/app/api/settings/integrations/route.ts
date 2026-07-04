import { NextResponse } from 'next/server';
import { INTEGRATIONS } from '@/lib/integrations';
import { getUserFromRequest } from '@/lib/auth/session';
import { listConnections, getCredentials } from '@/lib/integrations/store';
import { isOAuthIntegration, credentialFields, type CredentialField } from '@/lib/integrations/oauth';
import { resolveCreds } from '@/lib/integrations/creds';

export const dynamic = 'force-dynamic';

type ConnectorState = 'connected' | 'needs-setup';

interface ConnectorMeta {
  oauth: boolean;                 // supports the OAuth connect flow
  provider_configured: boolean;   // credentials available (this user's, or env fallback) → Connect works
  has_credentials: boolean;       // this user saved their own app credentials
  fields: CredentialField[];      // credential form fields to render
  account_label: string | null;
  source: 'oauth' | 'env' | null;
}

/**
 * GET /api/settings/integrations — per-user connection status.
 * An integration is "connected" when the user has a stored OAuth connection for
 * it, OR its server env var is present (deployment-wide fallback). Also returns
 * per-integration metadata so the UI knows whether Connect is available.
 */
export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  const conns = user ? listConnections(user.sub) : [];
  const byId = new Map(conns.map((c) => [c.integration_id, c]));

  const statuses: Record<string, ConnectorState> = {};
  const meta: Record<string, ConnectorMeta> = {};
  const connectedLabels: string[] = [];
  const events: string[] = [];

  for (const integration of INTEGRATIONS) {
    const conn = byId.get(integration.id);
    const oauth = isOAuthIntegration(integration.id);
    const hasToken = !!conn?.access_token;
    const envConfigured = typeof process.env[integration.key] === 'string' && process.env[integration.key]!.trim().length > 0;
    // OAuth integrations are "connected" only when the USER completed OAuth
    // (a stored token). Env presence just enables the Connect button. Non-OAuth
    // (api-key) integrations treat the env var itself as the credential.
    const connected = oauth ? hasToken : (hasToken || envConfigured);
    const source: ConnectorMeta['source'] = hasToken ? 'oauth' : (!oauth && envConfigured) ? 'env' : null;

    statuses[integration.id] = connected ? 'connected' : 'needs-setup';
    meta[integration.id] = {
      oauth,
      provider_configured: oauth && !!user ? !!resolveCreds(user.sub, integration.id) : false,
      has_credentials: oauth && !!user ? !!getCredentials(user.sub, integration.id)?.client_secret : false,
      fields: oauth ? credentialFields(integration.id) : [],
      account_label: conn?.account_label ?? null,
      source,
    };

    if (connected) {
      connectedLabels.push(integration.label);
      events.push(
        hasToken
          ? `${integration.label} connected${conn?.account_label ? ` as ${conn.account_label}` : ''}.`
          : `${integration.label} connected — server credentials detected.`,
      );
    }
  }

  return NextResponse.json({
    statuses,
    meta,
    connected: connectedLabels.length,
    total: INTEGRATIONS.length,
    events,
  });
}
