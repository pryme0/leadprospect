/**
 * Best-effort "open a direct message with this lead" deep links, per platform.
 *
 * Where a platform exposes a real web DM entry point we link straight to it
 * (Instagram ig.me, Facebook m.me, LinkedIn compose). Where it doesn't (X,
 * TikTok, Threads have no reliable compose-by-username URL on the web), we fall
 * back to the person's profile — one click still lands the user on the page with
 * the "Message" button. Returns null only when we have neither a handle nor a
 * profile URL to work with.
 */
export function dmDeepLink(opts: {
  platform: string | null | undefined;
  username?: string | null;
  profileUrl?: string | null;
}): string | null {
  const p = (opts.platform || '').toLowerCase();
  const handle = (opts.username || '').replace(/^@+/, '').trim();
  const profile = opts.profileUrl?.trim() || null;
  const h = handle ? encodeURIComponent(handle) : '';

  switch (p) {
    case 'instagram':
    case 'ig':
      // Opens the Instagram DM thread with this user directly.
      return handle ? `https://ig.me/m/${h}` : profile;
    case 'facebook':
    case 'fb':
      // Messenger deep link (works for handles/usernames with messaging on).
      return handle ? `https://m.me/${h}` : profile;
    case 'linkedin':
      // LinkedIn compose accepts the public profile slug as the recipient.
      return handle
        ? `https://www.linkedin.com/messaging/compose/?recipient=${h}`
        : profile;
    case 'x':
    case 'twitter':
      // No reliable compose-by-@handle on web → open the profile (Message button).
      return handle ? `https://x.com/${h}` : profile;
    case 'tiktok':
      return handle ? `https://www.tiktok.com/@${h}` : profile;
    case 'threads':
      return handle ? `https://www.threads.net/@${h}` : profile;
    default:
      return profile;
  }
}

/** Whether the deep link actually opens a message thread (vs just a profile). */
export function isTrueDmLink(platform: string | null | undefined): boolean {
  const p = (platform || '').toLowerCase();
  return p === 'instagram' || p === 'ig' || p === 'facebook' || p === 'fb' || p === 'linkedin';
}
