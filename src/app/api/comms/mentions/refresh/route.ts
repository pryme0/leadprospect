import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { ingestForUser, configuredProviders } from '@/lib/mentions/ingest';

export const dynamic = 'force-dynamic';

/**
 * POST /api/comms/mentions/refresh — ingest live mentions for the logged-in
 * company from all configured providers. Throttled (~10 min) unless { force:true }
 * (the manual "Refresh" button). Auto-called on the Mentions tab mount.
 */
export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  let force = false;
  try { force = !!(await req.json())?.force; } catch { /* no body */ }

  try {
    const result = await ingestForUser(user.org, force);
    return NextResponse.json({ ...result, configured: configuredProviders() });
  } catch (err) {
    console.error('[POST /api/comms/mentions/refresh]', err);
    return NextResponse.json({ ran: false, error: 'Ingestion failed' }, { status: 500 });
  }
}
