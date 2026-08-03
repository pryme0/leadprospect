/**
 * Evaluates automation rules (src/lib/leads/automation-store.ts) against a real
 * lead event and dispatches the matching actions. Rules only existed as CRUD
 * before this — nothing ever called `getEnabledRules` for a live lead. Wired in
 * from src/lib/leads/lead-events.ts, the single place lead/pipeline events fire.
 */
import { getEnabledRules, type AutomationRule } from './automation-store';
import { assignTag, listTags, createTag } from './tags-store';
import { assignLead } from './assignment-store';
import { sendSlackNotification } from '@/lib/integrations/slack';

export interface AutomationLeadContext {
  id: string;
  name: string;
  email?: string;
  intent_level?: string | null;
  source?: string | null;
}

type AutomationEvent = 'new_lead' | 'tag_assigned';

function ruleMatches(rule: AutomationRule, event: AutomationEvent, lead: AutomationLeadContext, tagName?: string): boolean {
  if (event === 'new_lead') {
    if (rule.trigger_type === 'new_lead') return true;
    if (rule.trigger_type === 'intent') return !!rule.trigger_value && rule.trigger_value === lead.intent_level;
    if (rule.trigger_type === 'source') return !!rule.trigger_value && rule.trigger_value === lead.source;
    return false;
  }
  if (event === 'tag_assigned') {
    return rule.trigger_type === 'tag' && !!rule.trigger_value && !!tagName
      && rule.trigger_value.toLowerCase() === tagName.toLowerCase();
  }
  return false;
}

async function runAction(orgId: string, rule: AutomationRule, lead: AutomationLeadContext): Promise<void> {
  switch (rule.action_type) {
    case 'add_tag': {
      const tags = await listTags(orgId);
      const tag = tags.find((t) => t.name.toLowerCase() === rule.action_value.toLowerCase())
        ?? await createTag(orgId, rule.action_value);
      await assignTag(orgId, lead.id, tag.id);
      break;
    }
    case 'assign_user':
      await assignLead(orgId, lead.id, rule.action_value, `automation:${rule.id}`);
      break;
    case 'move_stage': {
      // Dynamic import breaks the pipeline/store.ts <-> automation-runner.ts
      // module cycle (pipeline/store fires new-lead events which run rules here).
      const { updatePipelineRow } = await import('@/lib/pipeline/store');
      await updatePipelineRow(orgId, lead.id, { stage: rule.action_value as 'new' | 'contacted' | 'qualified' | 'won' | 'lost' });
      break;
    }
    case 'send_notification':
      await sendSlackNotification(orgId, 'new_lead', { leadName: lead.name, email: lead.email, source: lead.source ?? undefined });
      break;
  }
}

export async function runAutomationRules(
  orgId: string,
  event: AutomationEvent,
  lead: AutomationLeadContext,
  extra?: { tagName?: string },
): Promise<void> {
  const rules = await getEnabledRules(orgId);
  for (const rule of rules) {
    if (!ruleMatches(rule, event, lead, extra?.tagName)) continue;
    try {
      await runAction(orgId, rule, lead);
    } catch (err) {
      console.error(`[automation-runner] rule ${rule.id} (${rule.action_type}) failed`, err);
    }
  }
}
