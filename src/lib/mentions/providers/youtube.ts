import { MentionProvider, RawMention, BrandQuery, queryTerms, safeFetchJson } from './types';

/** YouTube Data API v3 search. Needs YOUTUBE_API_KEY (free quota). */
type YtItem = {
  id?: { videoId?: string };
  snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string };
};

export const youtube: MentionProvider = {
  name: 'youtube',
  platforms: ['youtube'],
  isConfigured: () => !!process.env.YOUTUBE_API_KEY,
  async search(q: BrandQuery, sinceIso: string): Promise<RawMention[]> {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return [];
    const out: RawMention[] = [];
    for (const term of queryTerms(q, 4)) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=15`
        + `&q=${encodeURIComponent(term)}&publishedAfter=${encodeURIComponent(sinceIso)}&key=${key}`;
      const data = await safeFetchJson<{ items?: YtItem[] }>(url);
      for (const it of data?.items ?? []) {
        const s = it.snippet;
        const vid = it.id?.videoId;
        if (!s || !vid) continue;
        const text = `${s.title ?? ''} — ${s.description ?? ''}`.replace(/\s+/g, ' ').trim();
        out.push({
          provider: 'youtube',
          platform: 'youtube',
          author: s.channelTitle || 'YouTube',
          handle: s.channelTitle || '',
          text: text.slice(0, 500),
          url: `https://www.youtube.com/watch?v=${vid}`,
          ts: Math.floor(new Date(s.publishedAt ?? sinceIso).getTime() / 1000),
        });
      }
    }
    return out;
  },
};
