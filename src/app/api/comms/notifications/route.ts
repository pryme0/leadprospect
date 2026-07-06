import { NextResponse } from 'next/server';
import { getDb, listMentions } from '@/lib/comms/db';
import { getConversations } from '@/lib/comms/conversations';
import { getUserFromRequest } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', instagram: 'Instagram',
  facebook: 'Facebook', tiktok: 'TikTok', messenger: 'Messenger',
  gmail: 'Gmail', outlook: 'Outlook', slack: 'Slack', email: 'Email',
};
const label = (p: string) => PLATFORM_LABEL[p] ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Web');

function relTime(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const trim = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export interface NotificationItem {
  id: string;
  type: 'mention' | 'message';
  title: string;
  body: string;
  platform: string;
  ts: number;
  time: string;
  href: string;
}

/**
 * GET /api/comms/notifications — unified, timestamped feed for the header bell:
 * new brand mentions + conversations with unread inbound messages. Each item
 * carries a deep-link `href` into Pulse (/admin/comms).
 */
export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ notifications: [], count: 0 });

    const db = getDb();

    const mentionItems: NotificationItem[] = listMentions(db, user.org, {}, 30).map((m) => ({
      id: `mention:${m.id}`,
      type: 'mention',
      title: `New mention on ${label(m.platform)} · ${m.author}`,
      body: trim(m.text),
      platform: m.platform,
      ts: m.detected_at,
      time: relTime(m.detected_at),
      href: `/admin/comms?tab=mentions&mention=${encodeURIComponent(m.id)}`,
    }));

    const conversations = await getConversations(db);
    const messageItems: NotificationItem[] = conversations
      .filter((c) => c.unread === 1)
      .map((c) => ({
        id: `convo:${c.id}`,
        type: 'message',
        title: `New message from ${c.customer}`,
        body: trim(c.snippet),
        platform: c.platform,
        ts: c.last_activity_ts,
        time: relTime(c.last_activity_ts),
        href: `/admin/comms?tab=inbox&convo=${encodeURIComponent(c.id)}`,
      }));

    const notifications = [...mentionItems, ...messageItems]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 30);

    return NextResponse.json({ notifications, count: notifications.length });
  } catch (err) {
    console.error('[GET /api/comms/notifications]', err);
    return NextResponse.json({ notifications: [], count: 0 }, { status: 500 });
  }
}
