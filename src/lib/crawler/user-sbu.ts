import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile } from '@/lib/settings/org-store';
import { sbuIdForUser } from '@/lib/crawler/control-client';

/**
 * Resolve the crawler SBU a request's user is scoped to.
 *
 * The user→SBU link is normally stored in the org profile (SQLite app.db). But
 * that store is per-environment, so on a fresh prod DB it's empty even though the
 * user's leads already exist in the SHARED crawler Postgres. The SBU id is
 * deterministic (`usr_<userId>`), so we fall back to deriving it from the user
 * id — this reconnects a fresh environment to the user's existing crawler data
 * without any reconfiguration.
 *
 * `provisioned` reflects whether the user has explicitly generated leads on THIS
 * environment (org profile has the link) — used for "get started" hints, not for
 * data scoping.
 */
export function resolveUserSbu(req: Request): { sbu: string | null; provisioned: boolean } {
  const user = getUserFromRequest(req);
  if (!user) return { sbu: null, provisioned: false };
  const stored = getOrgProfile(user.sub)?.crawler_sbu_id ?? null;
  return { sbu: stored ?? sbuIdForUser(user.sub), provisioned: !!stored };
}
