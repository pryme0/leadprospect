/**
 * Direct-to-Postgres SBU provisioning.
 *
 * The Next app and the crawler share the same Postgres. The crawler's batch cron
 * discovers work via listActiveSbus() over that DB — so registering a user's SBU
 * + keywords here is sufficient for the crawler to start crawling for them on its
 * next tick, WITHOUT needing the crawler's HTTP control API (CRAWLER_API_URL) to
 * be reachable. This is the reliable provisioning path; the HTTP client only adds
 * an optional "start a crawl right now" trigger on top.
 */
import { getSignalsPool } from './signals-db';

export interface DbProvisionResult {
  sbuReady: boolean;
  keywordsUpserted: number;
  activeKeywords: number;
}

/** Company context the crawler's per-company classifier uses to judge relevance. */
export interface SbuContext {
  summary?: string;
  target_audience?: string;
  pain_points?: string[];
}

/** Search terms grouped by the platform they're written for. Each term is
 *  stored in sbu_keywords with metadata.platform so each crawler pulls only
 *  the terms tuned for it (LinkedIn pain-phrases vs short TikTok/IG topics). */
export interface PlatformKeywords {
  linkedin?: string[];
  tiktok?: string[];
  instagram?: string[];
}

export async function provisionSbuInDb(
  sbuId: string,
  name: string,
  keywords: string[] | PlatformKeywords,
  context?: SbuContext,
  /** When true, keywords already on the SBU that are NOT in this call are set
   *  inactive — so user edits that remove a term stop the crawler using it. */
  opts?: { deactivateMissing?: boolean },
): Promise<DbProvisionResult> {
  const pool = getSignalsPool();
  if (!pool) return { sbuReady: false, keywordsUpserted: 0, activeKeywords: 0 };

  // Normalize input into (keyword, platform) pairs. A bare string[] is treated
  // as LinkedIn terms (back-compat with existing callers).
  const buckets: PlatformKeywords = Array.isArray(keywords) ? { linkedin: keywords } : keywords;
  const pairs: { keyword: string; platform: string }[] = [];
  const seen = new Set<string>();
  for (const platform of ['linkedin', 'tiktok', 'instagram'] as const) {
    for (const raw of buckets[platform] ?? []) {
      const keyword = (raw ?? '').trim();
      if (!keyword) continue;
      // Dedupe by (keyword) across platforms — first platform wins its tag.
      const key = keyword.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ keyword, platform });
    }
  }

  // Stored in sbus.metadata so the crawler classifies posts against THIS company.
  const metadata = JSON.stringify({
    summary: context?.summary ?? '',
    target_audience: context?.target_audience ?? '',
    pain_points: Array.isArray(context?.pain_points) ? context!.pain_points : [],
  });

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO sbus (id, name, active, metadata) VALUES ($1, $2, true, $3::jsonb)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, active = true, metadata = excluded.metadata, updated_at = now()`,
      [sbuId, name || sbuId, metadata],
    );

    let upserted = 0;
    for (const { keyword, platform } of pairs) {
      // Tag each keyword with its platform in the existing metadata JSONB so the
      // per-platform batch crons can filter (no schema migration needed).
      const r = await client.query(
        `INSERT INTO sbu_keywords (sbu_id, keyword, active, metadata)
           VALUES ($1, $2, true, jsonb_build_object('platform', $3::text))
         ON CONFLICT (sbu_id, keyword) DO UPDATE SET
           active = true,
           metadata = sbu_keywords.metadata || jsonb_build_object('platform', $3::text),
           updated_at = now()`,
        [sbuId, keyword, platform],
      );
      upserted += r.rowCount ?? 0;
    }

    // Reconcile removals: deactivate any keyword still active on this SBU that
    // the caller didn't include this time. Passing an empty set deactivates all.
    if (opts?.deactivateMissing) {
      await client.query(
        `UPDATE sbu_keywords SET active = false, updated_at = now()
          WHERE sbu_id = $1 AND active AND keyword <> ALL($2::text[])`,
        [sbuId, pairs.map((p) => p.keyword)],
      );
    }

    const chk = await client.query(
      'SELECT COUNT(*)::int AS n FROM sbu_keywords WHERE sbu_id = $1 AND active',
      [sbuId],
    );
    return { sbuReady: true, keywordsUpserted: upserted, activeKeywords: chk.rows[0]?.n ?? 0 };
  } finally {
    client.release();
  }
}
