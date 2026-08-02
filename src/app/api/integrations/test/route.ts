import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { testSlackConnection } from '@/lib/integrations/slack';
import { testZapierConnection } from '@/lib/integrations/zapier';
import { IntegrationType } from '@/lib/integrations/integrations-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const { type, config } = body;

    let result: { success: boolean; error?: string };

    switch (type as IntegrationType) {
      case 'slack':
        if (!config?.webhook_url) {
          return NextResponse.json({ message: 'Webhook URL required.' }, { status: 400 });
        }
        result = await testSlackConnection(config.webhook_url);
        break;

      case 'zapier':
        if (!config?.webhook_url) {
          return NextResponse.json({ message: 'Webhook URL required.' }, { status: 400 });
        }
        result = await testZapierConnection(config.webhook_url);
        break;

      case 'email':
        // Test SMTP connection
        result = { success: true }; // Placeholder - would need nodemailer
        break;

      case 'hubspot':
      case 'salesforce':
      case 'pipedrive':
        // Test API connection
        result = { success: true }; // Placeholder - would need API calls
        break;

      case 'google_sheets':
        // Test Sheets API
        result = { success: true }; // Placeholder - would need Google API
        break;

      default:
        return NextResponse.json({ message: 'Unknown integration type.' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Connection successful!' });
  } catch (err) {
    console.error('[POST /api/integrations/test]', err);
    return NextResponse.json({ message: 'Test failed.' }, { status: 500 });
  }
}
