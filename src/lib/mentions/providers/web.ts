import { MentionProvider, RawMention, BrandQuery, queryTerms, safeFetchJson } from './types';

/**
 * Web + news mentions. Prefers NewsData.io (NEWSDATA_API_KEY), falls back to
 * Bing Web/News Search (BING_SEARCH_KEY). Both have free tiers.
 */
type NewsDataResult = { title?: string; description?: string; link?: string; source_id?: string; pubDate?: string };
type BingPage = { name?: string; snippet?: string; url?: string; dateLastCrawled?: string };

export const web: MentionProvider = {
  name: 'web',
  platforms: ['news', 'web'],
  isConfigured: () => !!(process.env.NEWSDATA_API_KEY || process.env.BING_SEARCH_KEY),
  async search(q: BrandQuery, sinceIso: string): Promise<RawMention[]> {
    const since = new Date(sinceIso).getTime();
    const terms = queryTerms(q, 4);
    const out: RawMention[] = [];

    if (process.env.NEWSDATA_API_KEY) {
      const key = process.env.NEWSDATA_API_KEY;
      for (const term of terms) {
        const url = `https://newsdata.io/api/1/news?apikey=${key}&language=en&q=${encodeURIComponent(`"${term}"`)}`;
        const data = await safeFetchJson<{ results?: NewsDataResult[] }>(url);
        for (const r of data?.results ?? []) {
          const text = `${r.title ?? ''} ${r.description ?? ''}`.replace(/\s+/g, ' ').trim();
          if (!text || !r.link) continue;
          const ts = r.pubDate ? new Date(r.pubDate).getTime() : Date.now();
          if (ts < since) continue;
          out.push({ provider: 'web', platform: 'news', author: r.source_id || 'news', handle: r.source_id || '', text: text.slice(0, 500), url: r.link, ts: Math.floor(ts / 1000) });
        }
      }
      return out;
    }

    // Bing fallback
    const key = process.env.BING_SEARCH_KEY!;
    for (const term of terms) {
      const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(`"${term}"`)}&count=15&freshness=Month`;
      const data = await safeFetchJson<{ webPages?: { value?: BingPage[] } }>(url, {
        headers: { 'Ocp-Apim-Subscription-Key': key },
      });
      for (const p of data?.webPages?.value ?? []) {
        const text = `${p.name ?? ''} — ${p.snippet ?? ''}`.replace(/\s+/g, ' ').trim();
        if (!text || !p.url) continue;
        const ts = p.dateLastCrawled ? new Date(p.dateLastCrawled).getTime() : Date.now();
        out.push({ provider: 'web', platform: 'web', author: new URL(p.url).hostname.replace(/^www\./, ''), handle: '', text: text.slice(0, 500), url: p.url, ts: Math.floor(ts / 1000) });
      }
    }
    return out;
  },
};
