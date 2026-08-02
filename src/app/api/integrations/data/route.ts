import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { getOAuthConnection } from '@/lib/integrations/oauth-store';
import { getHubSpotContacts, getHubSpotDeals, getHubSpotAccountInfo } from '@/lib/integrations/providers/hubspot';
import { getPipedrivePersons, getPipedriveDeals, getPipedriveUser } from '@/lib/integrations/providers/pipedrive';
import { listGoogleSheets, getSheetData } from '@/lib/integrations/providers/google';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const provider = req.nextUrl.searchParams.get('provider');
  const dataType = req.nextUrl.searchParams.get('type') ?? 'account';

  if (!provider) {
    return NextResponse.json({ message: 'Provider required.' }, { status: 400 });
  }

  const connection = await getOAuthConnection(user.org, provider);
  if (!connection) {
    return NextResponse.json({ message: 'Not connected.', connected: false }, { status: 400 });
  }

  try {
    switch (provider) {
      case 'hubspot': {
        if (dataType === 'account') {
          const info = await getHubSpotAccountInfo(user.org);
          return NextResponse.json({ data: info });
        }
        if (dataType === 'contacts') {
          const contacts = await getHubSpotContacts(user.org);
          return NextResponse.json({ data: contacts?.results ?? [] });
        }
        if (dataType === 'deals') {
          const deals = await getHubSpotDeals(user.org);
          return NextResponse.json({ data: deals?.results ?? [] });
        }
        break;
      }

      case 'pipedrive': {
        if (dataType === 'account') {
          const info = await getPipedriveUser(user.org);
          return NextResponse.json({ data: info });
        }
        if (dataType === 'contacts' || dataType === 'persons') {
          const persons = await getPipedrivePersons(user.org);
          return NextResponse.json({ data: persons?.data ?? [] });
        }
        if (dataType === 'deals') {
          const deals = await getPipedriveDeals(user.org);
          return NextResponse.json({ data: deals?.data ?? [] });
        }
        break;
      }

      case 'google': {
        if (dataType === 'sheets') {
          const sheets = await listGoogleSheets(user.org);
          return NextResponse.json({ data: sheets?.files ?? [] });
        }
        if (dataType === 'sheet_data') {
          const sheetId = req.nextUrl.searchParams.get('sheetId');
          const range = req.nextUrl.searchParams.get('range') ?? 'A1:Z100';
          if (!sheetId) {
            return NextResponse.json({ message: 'sheetId required.' }, { status: 400 });
          }
          const data = await getSheetData(user.org, sheetId, range);
          return NextResponse.json({ data: data?.values ?? [] });
        }
        break;
      }
    }

    return NextResponse.json({ message: 'Unknown data type.' }, { status: 400 });
  } catch (err) {
    console.error(`[GET /api/integrations/data ${provider}/${dataType}]`, err);
    return NextResponse.json({ message: 'Failed to fetch data.' }, { status: 500 });
  }
}
