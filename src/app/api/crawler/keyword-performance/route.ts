import { NextResponse } from 'next/server';
import { getSignalsPool } from '@/lib/crawler/signals-db';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';

export const dynamic = 'force-dynamic';

const DAILY_TARGET = 5;

interface KeywordPerfRow {
  keyword: string;
  active: boolean;
  times_crawled: number;
  hot_count: number;
  total_signals: number;
  hit_rate: number;
  created_at: string;
  updated_at: string;
  last_scored_at: string | null;
}

/**
 * GET /api/crawler/keyword-performance — the logged-in org's keyword
 * refinement state: daily hot-lead pace vs. the 5/day target, top-performing
 * keywords, recently pruned (dead) keywords, and recently added ones.
 *
 * Mirrors the auth-scoping pattern in /api/crawler/leads (getUserFromRequest →
 * getOrgProfile → crawler_sbu_id) and reads the columns the crawler's
 * keyword-refine cron writes (thelixcrawler/src/sbus/sbu-repository.ts).
 */
export async function GET(req: Request) {
  try {
    const { sbu, provisioned } = await resolveUserSbu(req);

    if (!sbu) {
      return NextResponse.json({
        pace: 0, target: DAILY_TARGET, onPace: false,
        topKeywords: [], recentlyPruned: [], recentlyAdded: [],
        escalationBoost: 0, needs_generation: !provisioned,
      });
    }

    const pool = getSignalsPool();
    if (!pool) {
      return NextResponse.json({ error: 'Signals Postgres not configured' }, { status: 500 });
    }

    const [paceRes, keywordsRes, sbuRes] = await Promise.all([
      pool.query<{ hot: string }>(
        `SELECT COUNT(*)::int AS hot FROM signals
         WHERE sbu_id = $1 AND intent_level IN ('HIGH_INTENT','MEDIUM_INTENT')
           AND created_at > NOW() - INTERVAL '3 days'`,
        [sbu],
      ),
      pool.query<KeywordPerfRow>(
        `SELECT keyword, active, times_crawled, hot_count, total_signals, hit_rate,
                created_at, updated_at, last_scored_at
         FROM sbu_keywords WHERE sbu_id = $1`,
        [sbu],
      ),
      pool.query<{ metadata: Record<string, unknown> }>(
        `SELECT metadata FROM sbus WHERE id = $1`,
        [sbu],
      ),
    ]);

    const pace = Number(paceRes.rows[0]?.hot ?? 0) / 3;
    const rows = keywordsRes.rows;

    const topKeywords = rows
      .filter((r) => r.active && r.total_signals >= 1)
      .sort((a, b) => b.hit_rate - a.hit_rate || b.total_signals - a.total_signals)
      .slice(0, 10)
      .map((r) => ({ keyword: r.keyword, hitRate: r.hit_rate, hotCount: r.hot_count, totalSignals: r.total_signals }));

    const recentlyPruned = rows
      .filter((r) => !r.active)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
      .map((r) => ({ keyword: r.keyword, timesCrawled: r.times_crawled, prunedAt: r.updated_at }));

    const threeDaysAgo = Date.now() - 3 * 86_400_000;
    const recentlyAdded = rows
      .filter((r) => r.active && new Date(r.created_at).getTime() > threeDaysAgo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((r) => ({ keyword: r.keyword, addedAt: r.created_at }));

    const escalationBoost = Number((sbuRes.rows[0]?.metadata as Record<string, unknown> | undefined)?.escalation_boost ?? 0) || 0;

    return NextResponse.json({
      pace,
      target: DAILY_TARGET,
      onPace: pace >= DAILY_TARGET,
      activeKeywordCount: rows.filter((r) => r.active).length,
      topKeywords,
      recentlyPruned,
      recentlyAdded,
      escalationBoost,
    });
  } catch (err) {
    console.error('[GET /api/crawler/keyword-performance]', err);
    return NextResponse.json({ error: 'Failed to load keyword performance' }, { status: 500 });
  }
}
