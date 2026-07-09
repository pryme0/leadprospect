import { NextResponse } from 'next/server';
import { getDb, listMentions, markMentionReplied, markMentionsSeen, ensureCommsReady, type MentionFilter } from '@/lib/comms/db';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOrgProfile, hasBrandTerms } from '@/lib/settings/org-store';
import { getUserTier } from '@/lib/subscription/server-store';
import { TIER_LIMITS } from '@/lib/subscription/tiers';

export const dynamic = 'force-dynamic';

/** GET /api/comms/mentions — the logged-in company's brand mentions (per-user). */
export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

    const sp = new URL(req.url).searchParams;
    const filter: MentionFilter = {
      platform: sp.get('platform') ?? undefined,
      sentiment: sp.get('sentiment') ?? undefined,
      status: (sp.get('status') as MentionFilter['status']) ?? undefined,
      q: sp.get('q') ?? undefined,
    };

    const db = getDb();
    let rows = await listMentions(db, user.org, filter);

    // Basic-tier daily mentions cap — display-only truncation. The true
    // rolling-30-day count (comms/stats KPIs, the chart) is computed
    // separately via countMentions() and is never affected by this.
    const tier = await getUserTier(user.org) ?? 'basic';
    const dailyLimit = TIER_LIMITS[tier].maxMentionsPerDay;
    if (dailyLimit !== null) {
      const todayStartSec = Math.floor(new Date(new Date().setUTCHours(0, 0, 0, 0)).getTime() / 1000);
      rows = rows.filter((m) => m.detected_at >= todayStartSec).slice(0, dailyLimit);
    }

    const mentions = rows.map((m) => ({
      id: m.id,
      platform: m.platform,
      author: m.author,
      handle: m.handle,
      initials: m.initials,
      text: m.text,
      url: m.url,
      time: m.time,
      sentiment: m.sentiment,
      context: m.context,
      replied: m.replied === 1,
      seen: m.seen === 1,
    }));

    const profile = await getOrgProfile(user.org);
    return NextResponse.json({
      mentions,
      count: mentions.length,
      needs_setup: !hasBrandTerms(profile),
    });
  } catch (err) {
    console.error('[GET /api/comms/mentions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/comms/mentions —
 *  { action: 'seen' }            → mark all the user's mentions seen (clears badge)
 *  { id, text? }                 → mark a mention replied (+ log the reply text)
 */
export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

    const body = (await req.json()) as { action?: string; id?: string; text?: string };
    const db = getDb();

    if (body.action === 'seen') {
      const changed = await markMentionsSeen(db, user.org, body.id);
      return NextResponse.json({ success: true, changed });
    }

    if (!body.id) return NextResponse.json({ error: 'Mention id is required' }, { status: 400 });
    const ok = await markMentionReplied(db, user.org, body.id);
    if (!ok) return NextResponse.json({ error: 'Mention not found' }, { status: 404 });
    if (body.text && body.text.trim()) {
      await ensureCommsReady();
      await db.query('INSERT INTO sent_replies (conversation_id, text, tone, kb_enabled) VALUES ($1, $2, $3, $4)',
        [`mention:${body.id}`, body.text.trim(), 'professional', 1]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/comms/mentions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
