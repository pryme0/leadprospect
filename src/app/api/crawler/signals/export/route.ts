import { listSignals, type SignalRow } from '@/lib/crawler/signals-db';
import { resolveUserSbu } from '@/lib/crawler/user-sbu';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile } from '@/lib/settings/org-store';
import { llmJson, llmConfigured } from '@/lib/llm/json';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crawler/signals/export — CSV of the logged-in org's signals with
 * everything needed to follow up: contact details, the platform/post link, what
 * the person posted, the CHALLENGE they're facing (pain points + summary), and a
 * SUGGESTED REPLY.
 *
 * Suggested replies: the top rows by urgency get an AI-drafted, personalized
 * message (bounded so the request stays fast); the rest get a solid pain-aware
 * template so every row is actionable. Query: intent_level, with_email, limit.
 */

const MAX_ROWS = 300;          // hard cap on exported rows
const AI_REPLY_CAP = 60;       // rows that get an AI-crafted reply (rest = template)
const AI_CONCURRENCY = 6;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Always quote — content/pain points contain commas, quotes and newlines.
  return `"${s.replace(/"/g, '""')}"`;
}

function firstName(row: SignalRow): string {
  const full = (row.enriched_name || row.name || '').trim();
  return full ? full.split(/\s+/)[0] : '';
}

/** Pain-aware fallback used when there's no AI reply for a row. */
function templateReply(row: SignalRow, company: string): string {
  const name = firstName(row);
  const hi = name ? `Hi ${name}, ` : 'Hi, ';
  const pain = (row.pain_points && row.pain_points[0]) || '';
  const lead = pain
    ? `saw you're dealing with ${pain.toLowerCase()} — that's exactly what we help with at ${company}.`
    : `saw your post and think we can help — this is exactly what we do at ${company}.`;
  return `${hi}${lead} Happy to share how, no pressure — want me to send a couple options?`;
}

async function aiReply(row: SignalRow, ctx: { company: string; about: string; services: string }): Promise<string | null> {
  const system = `You write the FIRST outreach message from a company to a potential customer found on ${row.source}. Warm, human, specific — reference what the person actually posted, then offer help. 1-3 short sentences, no links, no hashtags, friendly DM tone. Never salesy.`;
  const user = [
    `Our company: ${ctx.company || '(unknown)'}`,
    ctx.about ? `About us: ${ctx.about}` : '',
    ctx.services ? `What we do: ${ctx.services}` : '',
    `Platform: ${row.source}`,
    firstName(row) ? `Their name: ${firstName(row)}` : '',
    row.username ? `Their handle: @${row.username}` : '',
    row.content ? `What they posted:\n"${row.content.slice(0, 500)}"` : (row.summary ? `About them: ${row.summary}` : ''),
    row.pain_points?.length ? `Their challenge: ${row.pain_points.join('; ')}` : '',
  ].filter(Boolean).join('\n');
  try {
    const parsed = await llmJson(system, user, {
      type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false,
    }, 300);
    const msg = typeof parsed.message === 'string' ? parsed.message.trim() : '';
    return msg || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    const { sbu } = await resolveUserSbu(req);
    if (!user || !sbu) {
      return new Response('Unauthorized', { status: 401 });
    }

    const sp = new URL(req.url).searchParams;
    const intent = sp.get('intent_level');
    const withEmail = sp.get('with_email') === 'true';
    const limit = Math.min(Number(sp.get('limit') ?? MAX_ROWS) || MAX_ROWS, MAX_ROWS);

    const { signals } = await listSignals({
      sbu,
      intentLevel: intent === 'HIGH_INTENT' || intent === 'MEDIUM_INTENT' || intent === 'LOW_INTENT' ? intent : undefined,
      hasEmail: withEmail ? true : undefined,
      orderBy: 'urgency_score',
      excludeNonProspects: true,
      deduplicateByPerson: true,
      limit,
      offset: 0,
    });

    const profile = await getOrgProfile(user.org);
    const company = profile?.company_name || 'us';
    const ctx = { company, about: profile?.about || '', services: profile?.services || '' };

    // AI replies for the top rows (already urgency-ordered), concurrency-limited.
    const replies: (string | null)[] = new Array(signals.length).fill(null);
    if (llmConfigured()) {
      const aiRows = Math.min(signals.length, AI_REPLY_CAP);
      for (let i = 0; i < aiRows; i += AI_CONCURRENCY) {
        const slice = signals.slice(i, i + AI_CONCURRENCY);
        const out = await Promise.all(slice.map((r) => aiReply(r, ctx)));
        out.forEach((msg, j) => { replies[i + j] = msg; });
      }
    }

    const headers = [
      'Name', 'Email', 'Phone', 'Company', 'Title', 'Platform', 'Intent', 'Urgency',
      'Location', 'Detected', 'Profile URL', 'Post URL', 'What they posted',
      'Challenge (pain points)', 'Summary', 'Suggested reply',
    ];

    const rows = signals.map((r, i) => {
      const suggested = replies[i] || templateReply(r, company);
      return [
        r.enriched_name || r.name || '',
        r.enriched_email || r.email || '',
        r.enriched_phone || r.phone || '',
        r.enriched_company || '',
        r.enriched_title || '',
        r.source || '',
        (r.intent_level || '').replace('_INTENT', ''),
        r.urgency_score ?? '',
        r.location || '',
        r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
        r.enriched_linkedin_url || r.profile_url || '',
        r.post_url || r.url || '',
        r.content || '',
        (r.pain_points || []).join(' | '),
        r.summary || '',
        suggested,
      ].map(csvCell).join(',');
    });

    // BOM so Excel opens UTF-8 correctly; CRLF line endings for spreadsheet apps.
    const csv = '﻿' + [headers.map(csvCell).join(','), ...rows].join('\r\n');
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="synq-signals-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[GET /api/crawler/signals/export]', err);
    return new Response('Failed to export signals', { status: 500 });
  }
}
