'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import ConfirmModal from '@/components/admin/ConfirmModal';

const VIOLET = '#6D5EF9';
const inputStyle = { background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' } as const;
const inputClass = 'w-full rounded-xl border px-3 py-2 text-[13px] outline-none';

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  return { Authorization: `Bearer ${token}` };
}

interface Template {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string;
}

const emptyForm = { name: '', subject: '', content: '', category: 'general' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [copiedId, setCopiedId]   = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/outreach/templates', { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({ name: t.name, subject: t.subject ?? '', content: t.body, category: t.category });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch('/api/outreach/templates', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch('/api/outreach/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(form),
        });
      }
      cancelEdit();
      load();
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/outreach/templates?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE', headers: authHeader() });
    setDeleteTarget(null);
    load();
  };

  const copy = async (t: Template) => {
    try {
      await navigator.clipboard.writeText(t.body);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        label="Reuse"
        title="Message templates"
        description="Save reusable outreach messages so you're not retyping the same DM or email every time."
      />

      <div className="rounded-2xl border p-5" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>{editingId ? 'Edit template' : 'New template'}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cold intro" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Subject (email only)</label>
            <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Optional" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Category</label>
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="general" className={inputClass} style={inputStyle} />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Message</label>
          <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={5} placeholder="Hi {{first_name}}, …" className={`${inputClass} resize-y`} style={inputStyle} />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={saving} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: VIOLET }}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add template'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="rounded-full border px-5 py-2 text-[13px] font-semibold" style={{ borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>Your templates</p>
        {loading ? (
          <p className="text-[13px]" style={{ color: 'var(--a-text-40)' }}>Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--a-text-40)' }}>No templates yet — add one above.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border p-3.5" style={{ borderColor: 'var(--a-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--a-text)' }}>{t.name} <span className="text-[11px] font-normal" style={{ color: 'var(--a-text-40)' }}>· {t.category}</span></p>
                    {t.subject && <p className="text-[11px]" style={{ color: 'var(--a-text-40)' }}>Subject: {t.subject}</p>}
                    <p className="mt-1 line-clamp-2 text-[12px]" style={{ color: 'var(--a-text-60)' }}>{t.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => copy(t)} className="text-[11px] font-semibold" style={{ color: VIOLET }}>{copiedId === t.id ? 'Copied' : 'Copy'}</button>
                    <button onClick={() => startEdit(t)} className="text-[11px] font-semibold" style={{ color: 'var(--a-text-60)' }}>Edit</button>
                    <button onClick={() => setDeleteTarget(t)} className="text-[11px] font-semibold" style={{ color: '#f87171' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this template?"
        message={`"${deleteTarget?.name}" will be removed.`}
        tone="danger"
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
