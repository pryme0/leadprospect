/**
 * Lightweight company-website fetcher. Given the profile website URL, pulls the
 * homepage plus a few likely context pages (about / services / products /
 * pricing), strips HTML to readable text, and returns a single capped string for
 * the LLM analyzer. Dependency-free (uses global fetch + regex tag-strip) so no
 * new packages are required.
 */

const CANDIDATE_PATHS = ['', '/about', '/about-us', '/services', '/products', '/pricing', '/solutions'];
const PER_PAGE_CHARS = 6000;
const TOTAL_CHARS = 16000;
const FETCH_TIMEOUT_MS = 8000;

export interface FetchedWebsite {
  url: string;
  text: string;
  pagesFetched: string[];
}

function normalizeBase(input: string): string | null {
  let url = input.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    // Reject obvious placeholders so we don't waste a fetch (and an LLM call).
    if (/\.(demo|example|test|local|localhost)$/i.test(u.hostname) || u.hostname === 'localhost') {
      return null;
    }
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/** Strip tags, scripts, styles → collapsed plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'SYNQ-LeadIntelligence/1.0 (+website-analysis)' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('text/plain') && ct !== '') return null;
    const html = await res.text();
    const text = htmlToText(html);
    return text ? text.slice(0, PER_PAGE_CHARS) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch and concatenate readable text from the company website. Returns null
 * when the URL is missing/placeholder or nothing could be fetched.
 */
export async function fetchWebsiteText(website: string): Promise<FetchedWebsite | null> {
  const base = normalizeBase(website);
  if (!base) return null;

  const parts: string[] = [];
  const pagesFetched: string[] = [];

  for (const path of CANDIDATE_PATHS) {
    if (parts.join(' ').length >= TOTAL_CHARS) break;
    const pageUrl = `${base}${path}`;
    const text = await fetchPage(pageUrl);
    if (text) {
      parts.push(`# ${path || '/'}\n${text}`);
      pagesFetched.push(pageUrl);
    }
  }

  if (parts.length === 0) return null;
  return { url: base, text: parts.join('\n\n').slice(0, TOTAL_CHARS), pagesFetched };
}
