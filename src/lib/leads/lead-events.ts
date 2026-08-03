/**
 * Single dispatch point for real lead/pipeline events — fans out to custom
 * webhooks, Slack, Zapier, and automation rules. Called from the two places
 * those events actually happen: src/lib/pipeline/store.ts (stage changes,
 * including the "new lead" auto-entry in syncPipelineForOrg) and the tag
 * assignment routes. Every call here is best-effort: a failing integration
 * must never break the pipeline/tag mutation that triggered it.
 */
import { getSignalById } from '@/lib/crawler/signals-db';
import { deliverWebhookEvent } from '@/lib/integrations/webhooks-store';
import { sendSlackNotification } from '@/lib/integrations/slack';
import { sendZapierTrigger } from '@/lib/integrations/zapier';
import { runAutomationRules } from './automation-runner';
import type { PipelineStage } from '@/lib/pipeline/store';

interface LeadSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  intent_level?: string;
}

async function leadSummary(leadId: string): Promise<LeadSummary> {
  try {
    const s = await getSignalById(leadId);
    if (!s) return { id: leadId, name: leadId };
    return {
      id: leadId,
      name: (s.enriched_name ?? s.name ?? leadId) as string,
      email: s.enriched_email ?? s.email ?? undefined,
      phone: s.enriched_phone ?? s.phone ?? undefined,
      source: s.ingestion_category ?? s.source ?? undefined,
      intent_level: s.intent_level ?? undefined,
    };
  } catch {
    return { id: leadId, name: leadId };
  }
}

export async function fireStageChangedEvent(
  orgId: string,
  leadId: string,
  fromStage: string,
  toStage: PipelineStage,
  value: number | null,
): Promise<void> {
  const lead = await leadSummary(leadId);
  const legacyEvent = toStage === 'won' ? 'won' : 'stage_change';
  const dottedEvent = toStage === 'won' ? 'pipeline.won' : toStage === 'lost' ? 'pipeline.lost' : 'lead.stage_changed';

  await Promise.all([
    deliverWebhookEvent(orgId, dottedEvent, { lead_id: leadId, name: lead.name, email: lead.email, from_stage: fromStage, to_stage: toStage, value }),
    sendSlackNotification(orgId, legacyEvent, { leadName: lead.name, email: lead.email, stage: toStage, value: value ?? undefined, source: lead.source }),
    sendZapierTrigger(orgId, legacyEvent, { id: leadId, name: lead.name, email: lead.email, phone: lead.phone, source: lead.source, stage: toStage, value: value ?? undefined, intent: lead.intent_level }),
  ]);
}

export async function fireNewLeadEvent(orgId: string, leadId: string): Promise<void> {
  const lead = await leadSummary(leadId);
  await Promise.all([
    deliverWebhookEvent(orgId, 'lead.created', { lead_id: leadId, name: lead.name, email: lead.email, source: lead.source, intent_level: lead.intent_level }),
    sendSlackNotification(orgId, 'new_lead', { leadName: lead.name, email: lead.email, source: lead.source }),
    sendZapierTrigger(orgId, 'new_lead', { id: leadId, name: lead.name, email: lead.email, phone: lead.phone, source: lead.source, intent: lead.intent_level }),
    runAutomationRules(orgId, 'new_lead', { id: leadId, name: lead.name, email: lead.email, intent_level: lead.intent_level, source: lead.source }),
  ]);
}

export async function fireTagAssignedEvent(orgId: string, leadId: string, tagName: string): Promise<void> {
  const lead = await leadSummary(leadId);
  await Promise.all([
    deliverWebhookEvent(orgId, 'lead.tagged', { lead_id: leadId, name: lead.name, tag: tagName }),
    runAutomationRules(orgId, 'tag_assigned', { id: leadId, name: lead.name, email: lead.email, intent_level: lead.intent_level, source: lead.source }, { tagName }),
  ]);
}
