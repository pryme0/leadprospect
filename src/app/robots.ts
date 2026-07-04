import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/config';

/**
 * robots.txt — welcomes search AND AI-search crawlers, blocks private areas.
 * /admin and /api are disallowed for everyone (this is the definitive noindex
 * for the admin app, whose layout is a Client Component and can't set robots).
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ['/admin', '/admin/', '/api/'];

  // AI-search / assistant crawlers we explicitly want indexing & citing us.
  const aiBots = [
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',      // OpenAI / ChatGPT
    'PerplexityBot', 'Perplexity-User',              // Perplexity
    'ClaudeBot', 'anthropic-ai', 'Claude-Web',       // Anthropic / Claude
    'Google-Extended',                               // Google Gemini / AI Overviews training
    'Applebot-Extended',                             // Apple Intelligence
    'Amazonbot', 'Bytespider', 'CCBot',              // Alexa / TikTok / Common Crawl
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiBots.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
