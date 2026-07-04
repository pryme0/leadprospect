/** Provider adapter contract for live mention ingestion. */

export interface BrandQuery {
  companyName: string;
  keywords: string[];   // exact brand/product terms to match
  handles: string[];    // social handles/usernames
  exclude: string[];    // disambiguation terms (context, not enforced by all providers)
  summary?: string;     // what the company does — for AI relevance filtering
}

export interface RawMention {
  provider: string;     // adapter name, e.g. 'hackernews'
  platform: string;     // display platform, e.g. 'hackernews' | 'reddit' | 'x' | 'news'
  author: string;
  handle: string;       // @handle or channel/subreddit
  text: string;
  url: string;
  ts: number;           // unix seconds
}

export interface MentionProvider {
  name: string;
  /** Platforms this adapter can surface (for UI/labeling). */
  platforms: string[];
  /** True when required env keys are present. */
  isConfigured(): boolean;
  /** Return recent mentions matching the brand query since `sinceIso`. Never throws (returns []). */
  search(query: BrandQuery, sinceIso: string): Promise<RawMention[]>;
}

/** The distinct terms a provider should query (keywords + handles), capped. */
export function queryTerms(q: BrandQuery, max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...q.keywords, ...q.handles]) {
    const c = t.trim();
    const k = c.toLowerCase();
    if (c.length < 2 || seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/** fetch with a timeout; returns null on any failure so adapters degrade gracefully. */
export async function safeFetchJson<T>(url: string, init?: RequestInit, timeoutMs = 10_000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
