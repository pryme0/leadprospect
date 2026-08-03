'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import ConfirmModal from '@/components/admin/ConfirmModal';

/* ── Shared ─────────────────────────────────────────────────────────────── */
const VIOLET = '#6D5EF9';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${className}`} style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = { background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' } as const;
const inputClass = 'w-full rounded-xl border px-3 py-2 text-[13px] outline-none';

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  return { Authorization: `Bearer ${token}` };
}

/* ── Page ───────────────────────────────────────────────────────────────── */
const TABS = ['Rules', 'Webhooks', 'Notifications'] as const;
type Tab = typeof TABS[number];

export default function AutomationsPage() {
  const [tab, setTab] = useState<Tab>('Rules');

  return (
    <div className="space-y-5">
      <PageHeader
        label="Automate"
        title="Automations"
        description="Rules that react to new leads and stage changes, plus where those events get sent (webhooks, Slack, Zapier)."
      />

      <div className="flex gap-1.5 rounded-xl border p-1" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', width: 'fit-content' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors"
            style={{ background: tab === t ? VIOLET : 'transparent', color: tab === t ? '#fff' : 'var(--a-text-60)' }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Rules' && <RulesPanel />}
      {tab === 'Webhooks' && <WebhooksPanel />}
      {tab === 'Notifications' && <NotificationsPanel />}
    </div>
  );
}

/* ── Rules ──────────────────────────────────────────────────────────────── */
interface Rule {
  id: string; name: string;
  trigger_type: 'intent' | 'source' | 'tag' | 'new_lead';
  trigger_value: string | null;
  action_type: 'add_tag' | 'assign_user' | 'move_stage' | 'send_notification';
  action_value: string;
  enabled: boolean;
}

const TRIGGER_LABELS: Record<Rule['trigger_type'], string> = {
  new_lead: 'Any new lead', intent: 'Intent level is', source: 'Source is', tag: 'Tagged with',
};
const ACTION_LABELS: Record<Rule['action_type'], string> = {
  add_tag: 'Add tag', assign_user: 'Assign to user (by id)', move_stage: 'Move to stage', send_notification: 'Send Slack notification',
};

function RulesPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', trigger_type: 'new_lead' as Rule['trigger_type'], trigger_value: '', action_type: 'add_tag' as Rule['action_type'], action_value: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/automation/rules', { headers: authHeader() }).then((r) => r.json()).then((d) => setRules(d.rules ?? [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const createRule = async () => {
    if (!form.name.trim() || !form.action_value.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          name: form.name, triggerType: form.trigger_type,
          triggerValue: form.trigger_type === 'new_lead' ? null : form.trigger_value,
          actionType: form.action_type, actionValue: form.action_value,
        }),
      });
      setForm({ name: '', trigger_type: 'new_lead', trigger_value: '', action_type: 'add_tag', action_value: '' });
      load();
    } finally { setSaving(false); }
  };

  const toggle = async (rule: Rule) => {
    await fetch('/api/automation/rules', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ id: rule.id, action: 'toggle', enabled: !rule.enabled }) });
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/automation/rules?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE', headers: authHeader() });
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>New rule</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Tag hot leads" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="When">
            <select value={form.trigger_type} onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value as Rule['trigger_type'] }))} className={inputClass} style={inputStyle}>
              {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          {form.trigger_type !== 'new_lead' && (
            <Field label={form.trigger_type === 'intent' ? 'Value (HIGH_INTENT/MEDIUM_INTENT/LOW_INTENT)' : form.trigger_type === 'source' ? 'Value (e.g. linkedin)' : 'Tag name'}>
              <input value={form.trigger_value} onChange={(e) => setForm((f) => ({ ...f, trigger_value: e.target.value }))} className={inputClass} style={inputStyle} />
            </Field>
          )}
          <Field label="Then">
            <select value={form.action_type} onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value as Rule['action_type'] }))} className={inputClass} style={inputStyle}>
              {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label={form.action_type === 'move_stage' ? 'Stage (new/contacted/qualified/won/lost)' : form.action_type === 'assign_user' ? 'User id' : form.action_type === 'add_tag' ? 'Tag name' : 'Value (unused)'}>
            <input value={form.action_value} onChange={(e) => setForm((f) => ({ ...f, action_value: e.target.value }))} disabled={form.action_type === 'send_notification'} placeholder={form.action_type === 'send_notification' ? 'n/a' : undefined} className={inputClass} style={inputStyle} />
          </Field>
        </div>
        <button onClick={createRule} disabled={saving} className="mt-3 rounded-full px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: VIOLET }}>
          {saving ? 'Saving…' : 'Add rule'}
        </button>
      </Card>

      <Card>
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>Active rules</p>
        {loading ? (
          <p className="text-[13px]" style={{ color: 'var(--a-text-40)' }}>Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--a-text-40)' }}>No rules yet — add one above.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--a-border)' }}>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium" style={{ color: 'var(--a-text)' }}>{r.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--a-text-40)' }}>
                    {TRIGGER_LABELS[r.trigger_type]}{r.trigger_value ? ` "${r.trigger_value}"` : ''} → {ACTION_LABELS[r.action_type]}{r.action_value && r.action_type !== 'send_notification' ? ` "${r.action_value}"` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => toggle(r)} className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: r.enabled ? 'rgba(16,185,129,0.14)' : 'var(--a-hover2)', color: r.enabled ? '#34d399' : 'var(--a-text-40)' }}>
                    {r.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button onClick={() => setDeleteTarget(r)} className="text-[11px]" style={{ color: '#f87171' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this rule?"
        message={`"${deleteTarget?.name}" will stop running immediately.`}
        tone="danger"
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ── Webhooks ───────────────────────────────────────────────────────────── */
interface Webhook {
  id: string; name: string; url: string; events: string[]; enabled: boolean; last_status: number | null; last_triggered_at: string | null;
}

function WebhooksPanel() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', url: '', events: new Set<string>() });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/integrations/webhooks', { headers: authHeader() }).then((r) => r.json()).then((d) => { setWebhooks(d.webhooks ?? []); setEvents(d.events ?? []); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim() || !form.url.trim() || form.events.size === 0) return;
    setSaving(true);
    try {
      await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name: form.name, url: form.url, events: Array.from(form.events) }),
      });
      setForm({ name: '', url: '', events: new Set() });
      load();
    } finally { setSaving(false); }
  };

  const toggle = async (wh: Webhook) => {
    await fetch('/api/integrations/webhooks', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ id: wh.id, enabled: !wh.enabled }) });
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/integrations/webhooks?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE', headers: authHeader() });
    setDeleteTarget(null);
    load();
  };

  const toggleEvent = (ev: string) => {
    setForm((f) => {
      const next = new Set(f.events);
      if (next.has(ev)) next.delete(ev); else next.add(ev);
      return { ...f, events: next };
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>New webhook</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="My CRM sync" className={inputClass} style={inputStyle} /></Field>
          <Field label="URL (https://)"><input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://example.com/hooks/synq" className={inputClass} style={inputStyle} /></Field>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Fires on</p>
          <div className="flex flex-wrap gap-2">
            {events.map((ev) => (
              <label key={ev} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px]" style={{ borderColor: form.events.has(ev) ? VIOLET : 'var(--a-border2)', background: form.events.has(ev) ? `${VIOLET}14` : 'transparent', color: 'var(--a-text)' }}>
                <input type="checkbox" checked={form.events.has(ev)} onChange={() => toggleEvent(ev)} className="h-3 w-3" />
                {ev}
              </label>
            ))}
          </div>
        </div>
        <button onClick={create} disabled={saving} className="mt-3 rounded-full px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: VIOLET }}>
          {saving ? 'Saving…' : 'Add webhook'}
        </button>
      </Card>

      <Card>
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>Your webhooks</p>
        {loading ? (
          <p className="text-[13px]" style={{ color: 'var(--a-text-40)' }}>Loading…</p>
        ) : webhooks.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--a-text-40)' }}>No webhooks yet.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: 'var(--a-border)' }}>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium" style={{ color: 'var(--a-text)' }}>{wh.name}</p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--a-text-40)' }}>{wh.url} · {wh.events.join(', ')}</p>
                  {wh.last_status !== null && (
                    <p className="text-[11px]" style={{ color: wh.last_status < 300 ? '#34d399' : '#f87171' }}>Last delivery: HTTP {wh.last_status}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => toggle(wh)} className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: wh.enabled ? 'rgba(16,185,129,0.14)' : 'var(--a-hover2)', color: wh.enabled ? '#34d399' : 'var(--a-text-40)' }}>
                    {wh.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button onClick={() => setDeleteTarget(wh)} className="text-[11px]" style={{ color: '#f87171' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this webhook?"
        message={`"${deleteTarget?.name}" will stop receiving events.`}
        tone="danger"
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ── Notifications (Slack / Zapier) ────────────────────────────────────────── */
function NotificationsPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <NotifyCard type="slack" title="Slack" hint="Post a message to a Slack channel via an Incoming Webhook URL." fieldKey="notify_on" />
      <NotifyCard type="zapier" title="Zapier" hint="Trigger a Zap via a Zapier Catch Hook URL." fieldKey="trigger_on" />
    </div>
  );
}

function NotifyCard({ type, title, hint, fieldKey }: { type: 'slack' | 'zapier'; title: string; hint: string; fieldKey: 'notify_on' | 'trigger_on' }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [when, setWhen] = useState('all');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/integrations?type=${type}`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => {
        if (d.integration) {
          setWebhookUrl(d.integration.config?.webhook_url ?? '');
          setWhen(d.integration.config?.[fieldKey] ?? 'all');
          setEnabled(d.integration.enabled ?? true);
        }
      })
      .finally(() => setLoading(false));
  }, [type, fieldKey]);

  const save = async () => {
    setSaving(true);
    setNote(null);
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ type, name: title, config: { webhook_url: webhookUrl, [fieldKey]: when } }),
      });
      if (!enabled) {
        await fetch('/api/integrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ type, action: 'toggle', enabled: false }) });
      }
      setNote('Saved.');
    } finally { setSaving(false); }
  };

  const test = async () => {
    if (!webhookUrl.trim()) { setNote('Add a webhook URL first.'); return; }
    setTesting(true);
    setNote(null);
    try {
      const r = await fetch('/api/integrations/test', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ type, config: { webhook_url: webhookUrl } }) });
      const d = await r.json();
      setNote(r.ok ? 'Test message sent — check the channel.' : (d.error || d.message || 'Test failed.'));
    } catch {
      setNote('Network error.');
    } finally { setTesting(false); }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-semibold" style={{ color: 'var(--a-text)' }}>{title}</p>
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--a-text-50)' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-3.5 w-3.5" />
          Enabled
        </label>
      </div>
      <p className="mb-3 text-[12px]" style={{ color: 'var(--a-text-40)' }}>{hint}</p>
      {loading ? (
        <p className="text-[13px]" style={{ color: 'var(--a-text-40)' }}>Loading…</p>
      ) : (
        <div className="space-y-3">
          <Field label="Webhook URL">
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Send on">
            <select value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="all">Every event</option>
              <option value="new_lead">New leads only</option>
              <option value="stage_change">Stage changes only</option>
              <option value="won">Deals won only</option>
            </select>
          </Field>
          {note && <p className="text-[12px]" style={{ color: 'var(--a-text-60)' }}>{note}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 rounded-xl py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: VIOLET }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={test} disabled={testing} className="flex-1 rounded-xl border py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}>
              {testing ? 'Testing…' : 'Send test'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
