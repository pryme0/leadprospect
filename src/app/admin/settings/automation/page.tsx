'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface Rule {
  id: string;
  name: string;
  trigger_type: 'intent' | 'source' | 'pipeline_stage';
  trigger_value: string;
  action_type: 'add_tag' | 'assign_to' | 'move_pipeline' | 'send_notification';
  action_value: string;
  enabled: boolean;
  created_at: string;
}

const TRIGGER_TYPES = [
  { value: 'intent', label: 'Intent Level' },
  { value: 'source', label: 'Lead Source' },
  { value: 'pipeline_stage', label: 'Pipeline Stage' },
];

const ACTION_TYPES = [
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'assign_to', label: 'Assign to Team Member' },
  { value: 'move_pipeline', label: 'Move to Pipeline Stage' },
  { value: 'send_notification', label: 'Send Notification' },
];

export default function AutomationPage() {
  const theme = useWorkspaceTheme();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState({
    name: '',
    trigger_type: 'intent' as Rule['trigger_type'],
    trigger_value: '',
    action_type: 'add_tag' as Rule['action_type'],
    action_value: '',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const load = () => {
    if (!token) return;
    fetch('/api/leads/automation', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ id: '', name: '', trigger_type: 'intent', trigger_value: '', action_type: 'add_tag', action_value: '', enabled: true, created_at: '' });
    setForm({ name: '', trigger_type: 'intent', trigger_value: '', action_type: 'add_tag', action_value: '', enabled: true });
  };

  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({
      name: r.name,
      trigger_type: r.trigger_type,
      trigger_value: r.trigger_value,
      action_type: r.action_type,
      action_value: r.action_value,
      enabled: r.enabled,
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.trigger_value.trim() || !form.action_value.trim()) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await fetch(`/api/leads/automation/${editing.id}`, { method: 'PATCH', headers, body: JSON.stringify(form) });
      } else {
        await fetch('/api/leads/automation', { method: 'POST', headers, body: JSON.stringify(form) });
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: Rule) => {
    await fetch(`/api/leads/automation/${rule.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this automation rule?')) return;
    await fetch(`/api/leads/automation/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/admin/settings" className="text-xs text-white/40 hover:text-white/60">← Settings</Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Automation Rules</h1>
          <p className="mt-1 text-sm text-white/50">Auto-tag, assign, or move leads based on conditions</p>
        </div>
        <button onClick={openNew} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: theme.accent, color: '#fff' }}>
          + New Rule
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }} />
        </div>
      ) : rules.length === 0 && !editing ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
          <p className="text-white/60">No automation rules yet</p>
          <button onClick={openNew} className="mt-4 text-sm font-medium" style={{ color: theme.accent }}>Create your first rule</button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl px-5 py-4"
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', opacity: r.enabled ? 1 : 0.5 }}
            >
              <div className="min-w-0">
                <p className="font-medium text-white">{r.name}</p>
                <p className="mt-1 text-xs text-white/50">
                  When <span className="text-white/70">{r.trigger_type}</span> is <span className="text-white/70">{r.trigger_value}</span>
                  {' → '}
                  <span className="text-white/70">{r.action_type.replace(/_/g, ' ')}</span>: <span className="text-white/70">{r.action_value}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(r)}
                  className="rounded px-3 py-1.5 text-xs font-medium"
                  style={{ background: r.enabled ? 'rgba(34,197,94,0.15)' : 'var(--t-fg-06)', color: r.enabled ? '#22c55e' : 'var(--t-fg-50)' }}
                >
                  {r.enabled ? 'Active' : 'Paused'}
                </button>
                <button onClick={() => openEdit(r)} className="rounded px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--t-fg-06)', color: 'var(--t-fg-70)' }}>Edit</button>
                <button onClick={() => remove(r.id)} className="rounded px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white">{editing.id ? 'Edit Rule' : 'New Rule'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Rule Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                  style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  placeholder="e.g. Tag high-intent leads"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">When</label>
                  <select
                    value={form.trigger_type}
                    onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value as Rule['trigger_type'] }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                    style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  >
                    {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Equals</label>
                  <input
                    value={form.trigger_value}
                    onChange={(e) => setForm((f) => ({ ...f, trigger_value: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                    style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                    placeholder="HIGH_INTENT"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Then</label>
                  <select
                    value={form.action_type}
                    onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value as Rule['action_type'] }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                    style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  >
                    {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Value</label>
                  <input
                    value={form.action_value}
                    onChange={(e) => setForm((f) => ({ ...f, action_value: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                    style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                    placeholder="Hot Lead"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-white/70">Enable this rule</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ color: 'var(--t-fg-60)' }}>Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: theme.accent, color: '#fff' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
