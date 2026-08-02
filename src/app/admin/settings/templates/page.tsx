'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface Template {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  created_at: string;
}

export default function TemplatesPage() {
  const theme = useWorkspaceTheme();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const load = () => {
    if (!token) return;
    fetch('/api/leads/templates', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing({ id: '', name: '', subject: null, body: '', created_at: '' });
    setForm({ name: '', subject: '', body: '' });
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject || '', body: t.body });
  };

  const save = async () => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await fetch(`/api/leads/templates/${editing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/leads/templates', {
          method: 'POST',
          headers,
          body: JSON.stringify(form),
        });
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/leads/templates/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/admin/settings" className="text-xs text-white/40 hover:text-white/60">← Settings</Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Message Templates</h1>
          <p className="mt-1 text-sm text-white/50">Reusable outreach messages for leads</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: theme.accent, color: '#fff' }}
        >
          + New Template
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }} />
        </div>
      ) : templates.length === 0 && !editing ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
          <p className="text-white/60">No templates yet</p>
          <button onClick={openNew} className="mt-4 text-sm font-medium" style={{ color: theme.accent }}>Create your first template</button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl px-5 py-4"
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
            >
              <div className="min-w-0">
                <p className="font-medium text-white">{t.name}</p>
                {t.subject && <p className="text-xs text-white/40 truncate">{t.subject}</p>}
                <p className="mt-1 text-xs text-white/30 truncate max-w-md">{t.body}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(t)} className="rounded px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--t-fg-06)', color: 'var(--t-fg-70)' }}>Edit</button>
                <button onClick={() => remove(t.id)} className="rounded px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10">Delete</button>
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
            <h2 className="text-lg font-bold text-white">{editing.id ? 'Edit Template' : 'New Template'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                  style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  placeholder="e.g. Initial outreach"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Subject (optional)</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none"
                  style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  placeholder="Email subject line"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={5}
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none resize-none"
                  style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  placeholder="Hi {{name}}, ..."
                />
              </div>
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
