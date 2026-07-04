/**
 * HTTP client for thelixcrawler's Express control API (base URL = CRAWLER_API_URL).
 *
 * The Next.js app normally only READS the crawler's shared Postgres. This client
 * is the one place it WRITES/triggers: it provisions a per-user SBU + keywords
 * and kicks off crawls so each user gets leads scoped to their own website
 * analysis. All calls are best-effort and no-op when CRAWLER_API_URL is unset,
 * so the rest of the generate flow (analysis + keyword storage) still works
 * before the crawler is wired up.
 */

import { provisionSbuInDb, type SbuContext, type PlatformKeywords } from './provision-db';

const REQUEST_TIMEOUT_MS = 15_000;

export function crawlerConfigured(): boolean {
  return !!process.env.CRAWLER_API_URL;
}

/** Per-user SBU id — a lowercase slug the crawler accepts (^[a-z0-9_-]+$). */
export function sbuIdForUser(userId: string): string {
  const slug = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `usr_${slug}`.slice(0, 100);
}

function base(): string | null {
  const url = process.env.CRAWLER_API_URL;
  return url ? url.replace(/\/+$/, '') : null;
}

async function call(
  path: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; body: any }> {
  const b = base();
  if (!b) return { ok: false, status: 0, body: null };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${b}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    });
    let body: any = null;
    try { body = await res.json(); } catch { /* empty */ }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: String(err) } };
  } finally {
    clearTimeout(timer);
  }
}

export interface ProvisionResult {
  sbuId: string;
  sbuReady: boolean;
  keywordsAdded: number;
  crawlsStarted: number;
  skipped: boolean; // true when CRAWLER_API_URL is unset
  errors: string[];
}

/**
 * Idempotently ensure the user's SBU exists, sync its keywords, and start a
 * crawl per keyword. Safe to re-run — existing SBU/keywords are treated as OK.
 */
export async function provisionAndCrawl(input: {
  userId: string;
  companyName: string;
  /** LinkedIn/text-search terms — also used for the optional "crawl now" trigger. */
  keywords: string[];
  /** Optional short per-platform social terms (TikTok/Instagram). */
  socialKeywords?: Pick<PlatformKeywords, 'tiktok' | 'instagram'>;
  context?: SbuContext;
  startCrawl?: boolean;
  maxCrawls?: number;
}): Promise<ProvisionResult> {
  const sbuId = sbuIdForUser(input.userId);
  const result: ProvisionResult = {
    sbuId,
    sbuReady: false,
    keywordsAdded: 0,
    crawlsStarted: 0,
    skipped: false,
    errors: [],
  };

  // 1. Register the SBU + keywords directly in the shared Postgres. This is the
  //    reliable path — the crawler's batch cron discovers it from the DB and
  //    starts crawling on its next tick, even if CRAWLER_API_URL is unset.
  try {
    const db = await provisionSbuInDb(
      sbuId,
      input.companyName || sbuId,
      { linkedin: input.keywords, tiktok: input.socialKeywords?.tiktok, instagram: input.socialKeywords?.instagram },
      input.context,
    );
    if (db.sbuReady) {
      result.sbuReady = true;
      result.keywordsAdded = db.keywordsUpserted;
    } else {
      result.skipped = true; // no DB pool (DATABASE_URL unset)
      result.errors.push('signals Postgres not configured (DATABASE_URL missing)');
      return result;
    }
  } catch (err) {
    result.errors.push(`db provision failed: ${String(err)}`);
    return result;
  }

  // 2. Optionally ALSO trigger an immediate crawl via the crawler's HTTP API
  //    (a "crawl now" nicety on top of the cron). Requires CRAWLER_API_URL.
  if (input.startCrawl && crawlerConfigured()) {
    const cap = input.maxCrawls ?? input.keywords.length;
    for (const keyword of input.keywords.slice(0, cap)) {
      const crawl = await call('/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ keyword, sbu: sbuId, fetchComments: true, fetchEmails: true }),
      });
      if (crawl.ok || crawl.status === 202) result.crawlsStarted++;
      else result.errors.push(`crawl "${keyword}" failed (${crawl.status})`);
    }
  }

  return result;
}
