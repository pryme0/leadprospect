import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { hasModule } from '@/lib/subscription/server-store';
import { getSignalById } from '@/lib/crawler/signals-db';
import { toUiLead } from '@/lib/crawler/map';
import { recordOutreach } from '@/lib/outreach/store';
import { sendOutbound, isUnipileMessagable, unipileConfigured } from '@/lib/outreach/unipile';
import { mirrorOutreachToPulse } from '@/lib/outreach/pulse-bridge';

export const dynamic = 'force-dynamic';

/**
 * POST /api/outreach/send — reach a crawler-found lead directly.
 *   - Instagram / LinkedIn / X → real DM via Unipile (assisted fallback if the
 *     recipient can't be resolved or Unipile isn't configured).
 *   - TikTok (and anything Unipile can't message) → assisted: return the post/
 *     profile URL + text so the UI opens it and copies the draft.
 * Records outreach status and mirrors the thread into Pulse. Pulse subscribers only.
 * Body: { leadId, text }.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (!(await hasModule(user.org, 'comms'))) {
    return NextResponse.json({ message: 'Replying to leads requires an active Pulse subscription.' }, { status: 403 });
  }

  let body: { leadId?: string; text?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }
  const leadId = String(body.leadId ?? '');
  const text = String(body.text ?? '').trim();
  if (!leadId || !text) return NextResponse.json({ message: 'leadId and text are required.' }, { status: 400 });

  const row = await getSignalById(leadId);
  if (!row) return NextResponse.json({ message: 'Lead not found.' }, { status: 404 });
  const lead = toUiLead(row);
  const platform = (lead.source || 'linkedin').toLowerCase();
  const handle = lead.username ?? null;
  const url = lead.post_url || lead.profile_url || null;

  // Try a real DM for Unipile-messagable platforms with a resolvable handle.
  let assisted = true;
  let channel: 'unipile' | 'assisted' = 'assisted';
  let detail = '';
  if (handle && unipileConfigured() && isUnipileMessagable(platform)) {
    const r = await sendOutbound(platform, handle, text);
    if (r.sent) { assisted = false; channel = 'unipile'; }
    else detail = r.error ?? '';
  } else if (platform === 'tiktok') {
    detail = 'TikTok has no messaging API — assisted send.';
  } else if (!handle) {
    detail = 'No handle on this lead — assisted send.';
  }

  // Record status + mirror into Pulse (both real and assisted sends).
  recordOutreach(user.org, { leadId, platform, handle, status: 'sent', message: text, channel });
  mirrorOutreachToPulse(user.org, {
    leadId, platform, handle, name: lead.first_name || null, url, text, postContent: lead.post_content,
  });

  return NextResponse.json({
    ok: true,
    assisted,          // true → UI opens `url` + copies `text`
    channel,           // 'unipile' (real DM) | 'assisted'
    url,
    text,
    platform,
    detail,            // human-readable note on why assisted (if so)
  });
}
