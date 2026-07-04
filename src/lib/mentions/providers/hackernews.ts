import { MentionProvider, RawMention, BrandQuery, queryTerms, safeFetchJson } from './types';

/** Hacker News via the Algolia Search API — no API key required (always on). */
type HnHit = {
  objectID: string;
  author?: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  story_url?: string;
  created_at_i?: number;
};

export const hackernews: MentionProvider = {
  name: 'hackernews',
  platforms: ['hackernews'],
  isConfigured: () => true,
  async search(q: BrandQuery, sinceIso: string): Promise<RawMention[]> {
    const since = Math.floor(new Date(sinceIso).getTime() / 1000);
    const out: RawMention[] = [];
    for (const term of queryTerms(q, 5)) {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(term)}&tags=(story,comment)&numericFilters=created_at_i>${since}&hitsPerPage=20`;
      const data = await safeFetchJson<{ hits?: HnHit[] }>(url);
      for (const h of data?.hits ?? []) {
        const text = (h.title || h.story_text || h.comment_text || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        out.push({
          provider: 'hackernews',
          platform: 'hackernews',
          author: h.author || 'unknown',
          handle: h.author ? `@${h.author}` : '',
          text: text.slice(0, 500),
          url: h.story_url || h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          ts: h.created_at_i ?? since,
        });
      }
    }
    return out;
  },
};
