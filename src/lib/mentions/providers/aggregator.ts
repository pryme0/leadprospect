import { MentionProvider, RawMention, BrandQuery, queryTerms, safeFetchJson } from './types';

/**
 * Paid multi-platform aggregator (fallback for X / Instagram / Facebook, which
 * the free stack can't reach). Selected via MENTIONS_AGGREGATOR + a key.
 * Default implementation: Social Searcher (v2). Others are stubs that no-op.
 */
const NETWORK_TO_PLATFORM: Record<string, string> = {
  twitter: 'x', web: 'web', facebook: 'facebook', instagram: 'instagram',
  youtube: 'youtube', reddit: 'reddit', vimeo: 'web', dailymotion: 'web',
  tumblr: 'web', flickr: 'web', linkedin: 'linkedin',
};

type SsPost = { network?: string; posted?: string; text?: string; url?: string; user?: { name?: string; url?: string } };

export const aggregator: MentionProvider = {
  name: 'aggregator',
  platforms: ['x', 'facebook', 'instagram', 'reddit', 'youtube', 'web'],
  isConfigured: () => !!process.env.MENTIONS_AGGREGATOR_API_KEY,
  async search(q: BrandQuery, sinceIso: string): Promise<RawMention[]> {
    const key = process.env.MENTIONS_AGGREGATOR_API_KEY;
    if (!key) return [];
    const which = (process.env.MENTIONS_AGGREGATOR || 'social-searcher').toLowerCase();
    if (which !== 'social-searcher') {
      console.warn(`[mentions] aggregator "${which}" not implemented; add its adapter.`);
      return [];
    }

    const since = new Date(sinceIso).getTime();
    const out: RawMention[] = [];
    for (const term of queryTerms(q, 4)) {
      const url = `https://api.social-searcher.com/v2/search?q=${encodeURIComponent(term)}&key=${key}&limit=50`;
      const data = await safeFetchJson<{ posts?: SsPost[] }>(url);
      for (const p of data?.posts ?? []) {
        const text = (p.text ?? '').replace(/\s+/g, ' ').trim();
        if (!text || !p.url) continue;
        const ts = p.posted ? new Date(p.posted).getTime() : Date.now();
        if (ts < since) continue;
        out.push({
          provider: 'aggregator',
          platform: NETWORK_TO_PLATFORM[p.network ?? ''] ?? 'web',
          author: p.user?.name || 'unknown',
          handle: p.user?.url ? p.user.url.replace(/^https?:\/\//, '') : '',
          text: text.slice(0, 500),
          url: p.url,
          ts: Math.floor(ts / 1000),
        });
      }
    }
    return out;
  },
};
