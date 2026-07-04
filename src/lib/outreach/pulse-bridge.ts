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
import { getDb, upsertMention } from '@/lib/comms/db';
import { randomBytes } from 'crypto';

function initialsOf(name: string): string {
  return name.replace(/^[@r/]+/, '').split(/[\s._-]+/).map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2) || 'LD';
}

/** Log an outbound outreach as a replied Pulse mention thread. */
export function mirrorOutreachToPulse(
  userId: string,
  input: { leadId: string; platform: string; handle: string | null; name: string | null; url: string | null; text: string; postContent?: string | null },
): void {
  try {
    const db = getDb();
    const author = input.name || (input.handle ? `@${input.handle}` : 'Lead');
    upsertMention(db, userId, {
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
    const row = db.prepare('SELECT id FROM mentions WHERE user_id = ? AND content_hash LIKE ? ORDER BY detected_at DESC LIMIT 1')
      .get(userId, `outreach:${input.leadId}:%`) as { id: string } | undefined;
    if (row) {
      db.prepare('UPDATE mentions SET replied = 1, seen = 1 WHERE user_id = ? AND id = ?').run(userId, row.id);
      db.prepare('INSERT INTO sent_replies (conversation_id, text, tone, kb_enabled) VALUES (?, ?, ?, ?)')
        .run(`lead:${input.leadId}`, input.text.trim(), 'professional', 1);
    }
  } catch (err) {
    console.error('[mirrorOutreachToPulse]', err);
  }
}
