'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  last_triggered_at: string | null;
  last_status: number | null;
  created_at: string;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event: string;
  status: number;
  response_time_ms: number;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'lead.created', label: 'New Lead' },
  { value: 'lead.updated', label: 'Lead Updated' },
  { value: 'pipeline.stage_changed', label: 'Pipeline Stage Changed' },
  { value: 'pipeline.won', label: 'Deal Won' },
  { value: 'pipeline.lost', label: 'Deal Lost' },
];

export default function WebhooksPage() {
  const theme = useWorkspaceTheme();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[], enabled: true });
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const load = () => {
    if (!token) return;
    Promise.all([
      fetch('/api/leads/webhooks', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/leads/webhooks/logs', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([whRes, logsRes]) => {
        setWebhooks(whRes.webhooks ?? []);
        setLogs(logsRes.logs ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ id: '', name: '', url: '', events: [], secret: '', enabled: true, last_triggered_at: null, last_status: null, created_at: '' });
    setForm({ name: '', url: '', events: [], enabled: true });
  };

  const openEdit = (w: Webhook) => {
    setEditing(w);
    setForm({ name: w.name, url: w.url, events: w.events, enabled: w.enabled });
  };

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await fetch(`/api/leads/webhooks/${editing.id}`, { method: 'PATCH', headers, body: JSON.stringify(form) });
      } else {
        await fetch('/api/leads/webhooks', { method: 'POST', headers, body: JSON.stringify(form) });
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (webhook: Webhook) => {
    await fetch(`/api/leads/webhooks/${webhook.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ enabled: !webhook.enabled }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/leads/webhooks/${id}`, { method: 'DELETE', headers });
    load();
  };

  const test = async (webhook: Webhook) => {
    const res = await fetch(`/api/leads/webhooks/${webhook.id}/test`, { method: 'POST', headers });
    const data = await res.json();
    alert(data.success ? 'Test sent successfully!' : `Test failed: ${data.error}`);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/admin/settings" className="text-xs text-white/40 hover:text-white/60">← Settings</Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Webhooks</h1>
          <p className="mt-1 text-sm text-white/50">Send lead events to external services</p>
        </div>
        <button onClick={openNew} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: theme.accent, color: '#fff' }}>
          + New Webhook
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          <div className="space-y-3">
            {webhooks.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
                <p className="text-white/60">No webhooks configured</p>
                <button onClick={openNew} className="mt-4 text-sm font-medium" style={{ color: theme.accent }}>Create your first webhook</button>
              </div>
            ) : (
              webhooks.map((w) => (
                <div
                  key={w.id}
                  className="rounded-xl px-5 py-4"
                  style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', opacity: w.enabled ? 1 : 0.5 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{w.name}</p>
                      <p className="mt-1 text-xs text-white/40 truncate">{w.url}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {w.events.map((e) => (
                          <span key={e} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--t-fg-06)', color: 'var(--t-fg-60)' }}>
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {w.last_status && (
                        <span
                          className="rounded px-2 py-1 text-[10px] font-bold"
                          style={{
                            background: w.last_status < 300 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: w.last_status < 300 ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {w.last_status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--a-border)' }}>
                    <button onClick={() => toggle(w)} className="rounded px-3 py-1.5 text-xs font-medium" style={{ background: w.enabled ? 'rgba(34,197,94,0.15)' : 'var(--t-fg-06)', color: w.enabled ? '#22c55e' : 'var(--t-fg-50)' }}>
                      {w.enabled ? 'Active' : 'Paused'}
                    </button>
                    <button onClick={() => test(w)} className="rounded px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--t-fg-06)', color: 'var(--t-fg-70)' }}>Test</button>
                    <button onClick={() => setShowSecret(showSecret === w.id ? null : w.id)} className="rounded px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--t-fg-06)', color: 'var(--t-fg-70)' }}>
                      {showSecret === w.id ? 'Hide Secret' : 'Show Secret'}
                    </button>
                    <button onClick={() => openEdit(w)} className="rounded px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--t-fg-06)', color: 'var(--t-fg-70)' }}>Edit</button>
                    <button onClick={() => remove(w.id)} className="rounded px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10">Delete</button>
                  </div>
                  {showSecret === w.id && (
                    <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--t-fg-03)' }}>
                      <p className="text-[10px] font-medium text-white/40 mb-1">Signing Secret (HMAC-SHA256)</p>
                      <code className="text-xs text-white/70 break-all">{w.secret}</code>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Logs */}
          <div className="rounded-xl" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--a-border)' }}>
              <h2 className="font-semibold text-white">Recent Deliveries</h2>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {logs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--t-fg-03)' }}>
                  <div className="min-w-0">
                    <p className="text-xs text-white/70 truncate">{log.event}</p>
                    <p className="text-[10px] text-white/30">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30">{log.response_time_ms}ms</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        background: log.status < 300 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: log.status < 300 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-sm text-white/40 text-center py-4">No deliveries yet</p>}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white">{editing.id ? 'Edit Webhook' : 'New Webhook'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                  style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                  style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">Events</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => toggleEvent(e.value)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                      style={{
                        background: form.events.includes(e.value) ? theme.accent + '20' : 'var(--t-fg-06)',
                        color: form.events.includes(e.value) ? theme.accent : 'var(--t-fg-60)',
                        border: form.events.includes(e.value) ? `1px solid ${theme.accent}50` : '1px solid transparent',
                      }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-white/70">Enable this webhook</span>
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
