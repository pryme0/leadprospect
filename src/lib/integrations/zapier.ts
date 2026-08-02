import { getEnabledIntegration, updateSyncStatus } from './integrations-store';

interface ZapierConfig {
  webhook_url: string;
  trigger_on: 'new_lead' | 'stage_change' | 'won' | 'all';
}

interface ZapierPayload {
  event: string;
  timestamp: string;
  lead: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    source?: string;
    stage?: string;
    value?: number;
    intent?: string;
  };
  org_id: string;
}

export async function sendZapierTrigger(
  orgId: string,
  event: 'new_lead' | 'stage_change' | 'won',
  leadData: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    source?: string;
    stage?: string;
    value?: number;
    intent?: string;
  },
): Promise<boolean> {
  const integration = await getEnabledIntegration(orgId, 'zapier');
  if (!integration) return false;

  const config = integration.config as unknown as ZapierConfig;
  if (config.trigger_on !== 'all' && config.trigger_on !== event) return false;

  const payload: ZapierPayload = {
    event,
    timestamp: new Date().toISOString(),
    lead: leadData,
    org_id: orgId,
  };

  try {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      await updateSyncStatus(orgId, 'zapier', `HTTP ${res.status}`);
      return false;
    }

    await updateSyncStatus(orgId, 'zapier', null);
    return true;
  } catch (err) {
    await updateSyncStatus(orgId, 'zapier', String(err));
    return false;
  }
}

export async function testZapierConnection(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'test',
        timestamp: new Date().toISOString(),
        message: 'LeadProspect integration test',
      }),
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
