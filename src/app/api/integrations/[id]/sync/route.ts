import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getConnection } from '@/lib/integrations/store';
import { fetchSalesforceRecords } from '@/lib/integrations/salesforce';
import { hasModule } from '@/lib/subscription/server-store';

export const dynamic = 'force-dynamic';

/** GET /api/integrations/:id/sync — pull live records from the connected account. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  // CRM/integration access is a Pro+ feature — gated on the 'email' module
  // (same tier boundary as Email Desk, see TIER_MODULES in tiers.ts).
  if (!(await hasModule(user.org, 'email'))) {
    return NextResponse.json({ message: 'Integrations require an active Pro or Max subscription.' }, { status: 402 });
  }

  const id = params.id;
  if (!getConnection(user.org, id)?.access_token) {
    return NextResponse.json({ message: 'Not connected.' }, { status: 409 });
  }

  if (id === 'salesforce') {
    try {
      const records = await fetchSalesforceRecords(user.org, 25);
      return NextResponse.json({ records, count: records.length });
    } catch (err) {
      return NextResponse.json({ message: err instanceof Error ? err.message : 'Sync failed.' }, { status: 400 });
    }
  }

  return NextResponse.json({ message: 'Live sync for this integration is coming soon.', records: [], count: 0 }, { status: 501 });
}
