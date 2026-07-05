/**
 * Usage-limit enforcement — thin DB-touching helpers consumed by the API
 * routes that need to check a tier's caps. Keeps src/lib/subscription/tiers.ts
 * pure config and avoids duplicating cap logic across routes.
 */
import type Database from 'better-sqlite3';
import { getUserTier } from './server-store';
import { TIER_LIMITS, type PlanTier } from './tiers';

export interface CapCheck {
  ok: boolean;
  limit: number | null;
  used: number;
  message?: string;
}

async function resolveTier(userId: string, tier?: PlanTier | null): Promise<PlanTier> {
  return tier ?? (await getUserTier(userId)) ?? 'basic';
}

/** Connected-account cap (Basic/Pro/Max). `excludeChannelId` lets a re-save of
 * an already-connected channel pass without counting against the cap. */
export async function checkConnectedAccountCap(
  db: Database.Database,
  userId: string,
  excludeChannelId?: string,
  tier?: PlanTier | null,
): Promise<CapCheck> {
  const t = await resolveTier(userId, tier);
  const limit = TIER_LIMITS[t].maxConnectedAccounts;
  if (limit === null) return { ok: true, limit: null, used: 0 };

  const { c } = db.prepare('SELECT COUNT(*) as c FROM connected_channels WHERE user_id = ? AND channel_id != ?')
    .get(userId, excludeChannelId ?? '') as { c: number };
  return {
    ok: c < limit,
    limit,
    used: c,
    message: c >= limit ? `Your plan allows ${limit} connected account${limit === 1 ? '' : 's'}. Upgrade to connect more.` : undefined,
  };
}
