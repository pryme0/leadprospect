/** Resolve the OAuth credentials to use for a user+integration: the user's own
 *  app credentials first, falling back to a platform-wide app in env. */
import { getCredentials } from './store';
import { envCredentials, type ResolvedCreds } from './oauth';

export async function resolveCreds(userId: string, integrationId: string): Promise<ResolvedCreds | null> {
  const c = await getCredentials(userId, integrationId);
  if (c?.client_id && c.client_secret) {
    return { clientId: c.client_id, clientSecret: c.client_secret, loginUrl: c.config.login_url };
  }
  return envCredentials(integrationId);
}
