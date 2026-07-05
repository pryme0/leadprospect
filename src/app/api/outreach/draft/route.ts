import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getOrgProfile } from '@/lib/settings/org-store';
import { getSignalById } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';
import { llmJson, llmConfigured } from '@/lib/llm/json';

export const dynamic = 'force-dynamic';

/**
 * POST /api/outreach/draft — generate a short, personalized first-contact
 * message to a crawler-found lead, using the org's context + the lead's actual
 * post/caption. Pulse ('comms') subscribers only.
 * Body: { leadId }.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.sub, 'comms'))) {
    return NextResponse.json({ message: 'Replying to leads requires an active Pulse subscription.' }, { status: 403 });
  }
  if (!llmConfigured()) {
    return NextResponse.json({ message: 'AI is not configured (set OPENAI_API_KEY or GEMINI_API_KEY).' }, { status: 503 });
  }

  let leadId = '';
  try { leadId = String((await req.json())?.leadId ?? ''); } catch { /* no body */ }
  if (!leadId) return NextResponse.json({ message: 'leadId is required.' }, { status: 400 });

  const row = await getSignalById(leadId);
  if (!row) return NextResponse.json({ message: 'Lead not found.' }, { status: 404 });
  const lead = toUiLead(row);

  const profile = await getOrgProfile(user.sub);
  const system = `You write the FIRST outreach message from a company to a potential customer found on social media. Warm, human, and specific — never salesy or spammy. 1-3 short sentences, no links, no hashtags. Reference what the person actually posted so it feels personal, then offer help. Match a friendly ${lead.source} DM tone.`;
  const userContent = [
    `Our company: ${profile?.company_name || '(unknown)'}`,
    profile?.about ? `About us: ${profile.about}` : '',
    profile?.services ? `What we do: ${profile.services}` : '',
    `Platform: ${lead.source}`,
    lead.first_name ? `Their name: ${lead.first_name}` : '',
    lead.username ? `Their handle: @${lead.username}` : '',
    lead.post_content ? `What they posted:\n"${String(lead.post_content).slice(0, 500)}"` : (lead.summary ? `About them: ${lead.summary}` : ''),
    '',
    'Write only the message text, nothing else.',
  ].filter(Boolean).join('\n');

  const schema = { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false };
  try {
    const parsed = await llmJson(system, userContent, schema, 400);
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
    if (!message) return NextResponse.json({ message: 'Could not generate a draft.' }, { status: 502 });
    return NextResponse.json({ draft: message });
  } catch (err) {
    console.error('[POST /api/outreach/draft]', err);
    return NextResponse.json({ message: 'Draft generation failed.' }, { status: 502 });
  }
}
