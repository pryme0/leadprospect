import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super/guard';
import { listOrgOwners } from '@/lib/auth/db';
import { enforceOrgs } from '@/lib/crawler/enforce';

export const dynamic = 'force-dynamic';

/**
 * POST /api/super/enforce — sweep every org and sync its crawler kill-switch
 * (`sbus.active`) with its current access state. Idempotent. Runs on the
 * super-admin dashboard load; also the target for a periodic Railway cron so
 * expired orgs stop crawling even if no one logs in.
 *
 * Also callable with a shared secret header for cron:
 *   X-Enforce-Key: $ENFORCE_CRON_KEY  (when ENFORCE_CRON_KEY is set)
 */
export async function POST(req: Request) {
  const cronKey = process.env.ENFORCE_CRON_KEY;
  const provided = req.headers.get('x-enforce-key');
  const cronAuthorized = !!cronKey && provided === cronKey;

  if (!cronAuthorized) {
    const auth = requireSuperAdmin(req);
    if ('error' in auth) return auth.error;
  }

  try {
    const orgIds = (await listOrgOwners()).map((o) => o.id);
    const results = await enforceOrgs(orgIds);
    const stopped = results.filter((r) => r.active === false).length;
    const running = results.filter((r) => r.active === true).length;
    return NextResponse.json({ ok: true, swept: results.length, running, stopped });
  } catch (err) {
    console.error('[POST /api/super/enforce]', err);
    return NextResponse.json({ message: 'Enforcement sweep failed.' }, { status: 500 });
  }
}
