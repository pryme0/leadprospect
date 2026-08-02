import { getEnabledIntegration, updateSyncStatus } from './integrations-store';

interface SlackConfig {
  webhook_url: string;
  channel?: string;
  notify_on: 'new_lead' | 'stage_change' | 'won' | 'all';
}

interface SlackMessage {
  text?: string;
  blocks?: object[];
  channel?: string;
}

export async function sendSlackNotification(
  orgId: string,
  event: 'new_lead' | 'stage_change' | 'won',
  data: { leadName: string; email?: string; stage?: string; value?: number; source?: string },
): Promise<boolean> {
  const integration = await getEnabledIntegration(orgId, 'slack');
  if (!integration) return false;

  const config = integration.config as unknown as SlackConfig;
  if (config.notify_on !== 'all' && config.notify_on !== event) return false;

  const message = buildSlackMessage(event, data);
  if (config.channel) message.channel = config.channel;

  try {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      await updateSyncStatus(orgId, 'slack', `HTTP ${res.status}`);
      return false;
    }

    await updateSyncStatus(orgId, 'slack', null);
    return true;
  } catch (err) {
    await updateSyncStatus(orgId, 'slack', String(err));
    return false;
  }
}

function buildSlackMessage(
  event: 'new_lead' | 'stage_change' | 'won',
  data: { leadName: string; email?: string; stage?: string; value?: number; source?: string },
): SlackMessage {
  const emoji = event === 'won' ? '🎉' : event === 'new_lead' ? '🆕' : '📊';
  const title = event === 'won'
    ? `${emoji} Deal Won!`
    : event === 'new_lead'
    ? `${emoji} New Lead`
    : `${emoji} Stage Change`;

  const fields = [
    { type: 'mrkdwn', text: `*Lead:*\n${data.leadName}` },
  ];

  if (data.email) fields.push({ type: 'mrkdwn', text: `*Email:*\n${data.email}` });
  if (data.stage) fields.push({ type: 'mrkdwn', text: `*Stage:*\n${data.stage}` });
  if (data.value) fields.push({ type: 'mrkdwn', text: `*Value:*\n$${data.value.toLocaleString()}` });
  if (data.source) fields.push({ type: 'mrkdwn', text: `*Source:*\n${data.source}` });

  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: title, emoji: true } },
      { type: 'section', fields },
    ],
  };
}

export async function testSlackConnection(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '✅ LeadProspect integration test successful!',
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
