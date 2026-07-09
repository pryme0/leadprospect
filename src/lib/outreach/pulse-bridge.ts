/**
 * Bridge: when an outbound reply is sent to a crawler lead from the Lead Queue,
 * mirror it into Pulse (comms.db) so the conversation is visible there as a
 * thread — including for assisted (TikTok) sends that never touch Unipile.
 *
 * We record it as a per-user mention row (the Pulse Mentions surface already
 * renders per-user, per-platform items with a reply state), tagged replied so it
 * reads as "you reached out". For real Unipile DMs the native chat also syncs;
 * this local mirror guarantees every outreach — assisted included — appears.
 */
import { getDb, upsertMention, ensureCommsReady } from '@/lib/comms/db';
import { randomBytes } from 'crypto';

function initialsOf(name: string): string {
  return name.replace(/^[@r/]+/, '').split(/[\s._-]+/).map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2) || 'LD';
}

/** Log an outbound outreach as a replied Pulse mention thread. */
export async function mirrorOutreachToPulse(
  userId: string,
  input: { leadId: string; platform: string; handle: string | null; name: string | null; url: string | null; text: string; postContent?: string | null },
): Promise<void> {
  try {
    const db = getDb();
    const author = input.name || (input.handle ? `@${input.handle}` : 'Lead');
    await upsertMention(db, userId, {
      platform: input.platform,
      author,
      handle: input.handle ? `@${input.handle.replace(/^@/, '')}` : '',
      initials: initialsOf(author),
      text: input.postContent ? String(input.postContent).slice(0, 500) : `Outreach to ${author}`,
      url: input.url || '',
      sentiment: 'neutral',
      context: 'lead-outreach',
      provider: 'outreach',
      content_hash: `outreach:${input.leadId}:${randomBytes(4).toString('hex')}`,
      detected_at: Math.floor(Date.now() / 1000),
    });
    // Mark it replied + log the reply text so Pulse shows the thread as handled.
    await ensureCommsReady();
    const row = (await db.query('SELECT id FROM mentions WHERE user_id = $1 AND content_hash ILIKE $2 ORDER BY detected_at DESC LIMIT 1',
      [userId, `outreach:${input.leadId}:%`])).rows[0] as { id: string } | undefined;
    if (row) {
      await db.query('UPDATE mentions SET replied = 1, seen = 1 WHERE user_id = $1 AND id = $2', [userId, row.id]);
      await db.query('INSERT INTO sent_replies (conversation_id, text, tone, kb_enabled) VALUES ($1, $2, $3, $4)',
        [`lead:${input.leadId}`, input.text.trim(), 'professional', 1]);
    }
  } catch (err) {
    console.error('[mirrorOutreachToPulse]', err);
  }
}
