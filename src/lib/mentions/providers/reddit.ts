import { MentionProvider, RawMention, BrandQuery, queryTerms, safeFetchJson } from './types';

/** Reddit search via app-only OAuth. Needs REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET (free). */
const UA = 'web:synq-pulse-mentions:v1 (by /u/synq)';
let cachedToken: { token: string; exp: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.token;
  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return cachedToken.token;
  } catch {
    return null;
  }
}

type RedditChild = {
  kind: string;
  data: {
    author?: string;
    title?: string;
    selftext?: string;
    body?: string;
    permalink?: string;
    url?: string;
    created_utc?: number;
    subreddit?: string;
  };
};

export const reddit: MentionProvider = {
  name: 'reddit',
  platforms: ['reddit'],
  isConfigured: () => !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
  async search(q: BrandQuery, sinceIso: string): Promise<RawMention[]> {
    const token = await getToken();
    if (!token) return [];
    const since = new Date(sinceIso).getTime() / 1000;
    const out: RawMention[] = [];
    for (const term of queryTerms(q, 5)) {
      const url = `https://oauth.reddit.com/search?q=${encodeURIComponent(`"${term}"`)}&sort=new&limit=25&type=link`;
      const data = await safeFetchJson<{ data?: { children?: RedditChild[] } }>(url, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA },
      });
      for (const c of data?.data?.children ?? []) {
        const d = c.data;
        if ((d.created_utc ?? 0) < since) continue;
        const text = (d.title || d.selftext || d.body || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        out.push({
          provider: 'reddit',
          platform: 'reddit',
          author: d.author || 'unknown',
          handle: d.subreddit ? `r/${d.subreddit}` : '',
          text: text.slice(0, 500),
          url: d.permalink ? `https://www.reddit.com${d.permalink}` : (d.url || 'https://www.reddit.com'),
          ts: Math.floor(d.created_utc ?? since),
        });
      }
    }
    return out;
  },
};
