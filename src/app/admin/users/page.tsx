'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';

type Role = 'admin' | 'viewer';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

const ROLE_PERMS: Record<Role, string[]> = {
  admin: ['Full dashboard access', 'Trigger ingestion & classify', 'Manage users', 'Delete leads (GDPR)', 'All settings'],
  viewer: ['View dashboard, leads & signals', 'View pipeline status', 'Read-only access'],
};

// ── Invite / Edit Modal ───────────────────────────────────────────────────────

function UserModal({
  mode, initial, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  initial?: AdminUser;
  onClose: () => void;
  onSave: (d: any) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initial?.role ?? 'viewer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !email.trim()) return setError('Name and email are required');
    if (mode === 'create' && password.length < 8) return setError('Password must be at least 8 characters');
    setSaving(true); setError('');
    try {
      const p: any = { name, email, role };
      if (password) p.password = password;
      await onSave(p);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const inp = "w-full border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00CEC8]/50 transition-colors [background:var(--a-input-bg)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,8,15,0.88)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>

        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-white font-bold">{mode === 'create' ? 'Invite User' : 'Edit User'}</p>
            <p className="text-white/30 text-xs mt-0.5">
              {mode === 'create' ? 'Grant access to the admin dashboard' : 'Update name, role, or reset password'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--t-fg-35)' }}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className={inp} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--t-fg-35)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@co.com"
                disabled={mode === 'edit'} className={`${inp} disabled:opacity-40 disabled:cursor-not-allowed`} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--t-fg-35)' }}>
              Password {mode === 'edit' && <span className="text-white/20 font-normal normal-case tracking-normal">— leave blank to keep current</span>}
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'create' ? 'Minimum 8 characters' : '••••••••'} className={inp} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t-fg-35)' }}>Role</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['admin', 'viewer'] as Role[]).map(r => {
                const on = role === r;
                const ac = r === 'admin' ? '#f97316' : '#EB4203';
                return (
                  <button key={r} onClick={() => setRole(r)}
                    className="p-4 rounded-xl border text-left transition-all duration-150"
                    style={{ background: on ? `${ac}0e` : 'rgba(255,255,255,0.02)', borderColor: on ? `${ac}45` : 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm" style={{ color: on ? ac : 'rgba(255,255,255,0.4)' }}>
                        {r === 'admin' ? 'Admin' : 'Viewer'}
                      </span>
                      <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: on ? ac : 'rgba(255,255,255,0.15)' }}>
                        {on && <div className="w-1.5 h-1.5 rounded-full" style={{ background: ac }} />}
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/25">
                      {r === 'admin' ? 'Full access + user management' : 'Read-only dashboard access'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/35 hover:text-white/60 border border-white/8 transition-all">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-[#050d14] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ flex: 2, background: 'linear-gradient(135deg,#00CEC8,#EB4203)' }}>
              {saving ? <><span className="w-3.5 h-3.5 border-2 border-[#050d14]/30 border-t-[#050d14] rounded-full animate-spin" />Saving...</> : mode === 'create' ? 'Invite User' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; user: AdminUser }>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.getUsers(); setUsers(r.data); }
    catch { notify('Failed to load users', false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (d: any) => { await adminApi.createUser(d); await load(); setModal(null); notify('User invited'); };
  const handleEdit = async (d: any) => {
    if (modal?.mode !== 'edit') return;
    await adminApi.updateUser(modal.user.id, d); await load(); setModal(null); notify('User updated');
  };
  const handleToggle = async (u: AdminUser) => {
    try { await adminApi.updateUser(u.id, { is_active: !u.is_active }); await load(); notify(u.is_active ? 'User deactivated' : 'User activated'); }
    catch (e: any) { notify(e?.response?.data?.message || 'Failed', false); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await adminApi.deleteUser(deleteTarget.id); await load(); setDeleteTarget(null); notify('User removed'); }
    catch (e: any) { notify(e?.response?.data?.message || 'Cannot delete', false); setDeleteTarget(null); }
  };

  return (
    <div className="h-full flex flex-col gap-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl border text-sm font-medium shadow-2xl"
          style={{ background: toast.ok ? 'rgba(0,206,200,0.08)' : 'rgba(239,68,68,0.08)', borderColor: toast.ok ? 'rgba(0,206,200,0.25)' : 'rgba(239,68,68,0.25)', color: toast.ok ? '#00CEC8' : '#f87171' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          padding: '18px 24px',
          boxShadow: 'var(--t-card-shadow)',
        }}
      >
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--t-accent)', fontFamily: 'var(--t-mono-font)' }}>
            06 · Team access
          </p>
          <h1 className="text-[22px] font-black tracking-tight" style={{ color: 'var(--t-fg-95)' }}>Users</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--t-fg-40)' }}>Manage dashboard users and their permissions</p>
        </div>
        <button onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#050d14] hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#00CEC8,#EB4203)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Invite User
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Left — Users table (main, takes most space) */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Summary chips */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Total', val: users.length, color: '#00CEC8' },
              { label: 'Admins', val: users.filter(u => u.role === 'admin').length, color: '#f97316' },
              { label: 'Viewers', val: users.filter(u => u.role === 'viewer').length, color: '#EB4203' },
              { label: 'Active', val: users.filter(u => u.is_active).length, color: '#34d399' },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/5"
                style={{ background: 'var(--a-card)' }}>
                <span className="font-bold text-sm" style={{ color: c.color }}>{c.val}</span>
                <span className="text-white/30 text-xs">{c.label}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/5 overflow-hidden flex-1"
            style={{ background: 'var(--a-card)' }}>

            {/* Table head */}
            <div className="grid gap-4 px-6 py-3.5 border-b border-white/5 text-white/25 text-[10px] font-bold uppercase tracking-widest"
              style={{ gridTemplateColumns: '1fr 120px 110px 120px 100px' }}>
              <div>User</div>
              <div>Role</div>
              <div>Status</div>
              <div>Joined</div>
              <div className="text-right">Actions</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-7 h-7 border-2 border-white/8 border-t-[#00CEC8] rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-white/3 flex items-center justify-center mx-auto mb-3 text-2xl">👥</div>
                <p className="text-white/25 text-sm">No users yet</p>
                <p className="text-white/15 text-xs mt-1">Click "Invite User" to add your first team member</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {users.map(u => {
                  const ac = u.role === 'admin' ? '#f97316' : '#EB4203';
                  const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={u.id} className="grid gap-4 px-6 py-4 items-center hover:bg-white/[0.015] transition-colors"
                      style={{ gridTemplateColumns: '1fr 120px 110px 120px 100px' }}>

                      {/* User */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `${ac}18`, color: ac }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{u.name}</p>
                          <p className="text-white/30 text-xs truncate">{u.email}</p>
                        </div>
                      </div>

                      {/* Role */}
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: `${ac}12`, color: ac, border: `1px solid ${ac}28` }}>
                          {u.role === 'admin' ? 'Admin' : 'Viewer'}
                        </span>
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${u.is_active ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400' : 'bg-white/3 border-white/8 text-white/25'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-white/15'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Joined */}
                      <div>
                        <p className="text-xs" style={{ color: 'var(--t-fg-35)' }}>{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => handleToggle(u)} title={u.is_active ? 'Deactivate' : 'Activate'}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
                          style={{ color: u.is_active ? '#00CEC8' : 'rgba(255,255,255,0.18)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <button onClick={() => setModal({ mode: 'edit', user: u })} title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteTarget(u)} title="Remove"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/8 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — Role reference sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          {(['admin', 'viewer'] as Role[]).map(role => {
            const ac = role === 'admin' ? '#f97316' : '#EB4203';
            const count = users.filter(u => u.role === role).length;
            return (
              <div key={role} className="rounded-2xl border p-5"
                style={{ background: `${ac}05`, borderColor: `${ac}18` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: `${ac}15` }}>
                      {role === 'admin' ? '⚡' : '👁'}
                    </div>
                    <span className="font-bold text-sm capitalize" style={{ color: ac }}>
                      {role === 'admin' ? 'Admin' : 'Viewer'}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: `${ac}15`, color: ac }}>
                    {count}
                  </span>
                </div>
                <ul className="space-y-2">
                  {ROLE_PERMS[role].map(p => (
                    <li key={p} className="flex items-start gap-2 text-[11px]" style={{ color: 'var(--t-fg-40)' }}>
                      <span className="mt-0.5 shrink-0" style={{ color: ac }}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Help note */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--t-fg-02)', borderColor: 'var(--a-border)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--t-fg-25)' }}>
              Invited users log in using the same admin login page. Deactivating a user revokes access without deleting their account.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <UserModal mode={modal.mode} initial={modal.mode === 'edit' ? modal.user : undefined}
          onClose={() => setModal(null)} onSave={modal.mode === 'create' ? handleCreate : handleEdit} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(3,8,15,0.88)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)' }}>
            <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-lg">⚠</div>
            <div>
              <h3 className="text-white font-bold">Remove {deleteTarget.name}?</h3>
              <p className="text-white/35 text-sm mt-1.5 leading-relaxed">Their access will be permanently revoked. This cannot be undone.</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 border border-white/8 transition-all">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/18 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
