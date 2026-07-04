'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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

/** limit/remaining are null when the plan grants unlimited seats (Max tier). */
interface Seats { used: number; limit: number | null; remaining: number | null; modules: string[]; tier?: string }

/* Brand palette — consistent with the rest of the admin (violet/cyan/mint). */
const VIOLET = '#6D5EF9';
const CYAN   = '#18D8FF';
const MINT   = '#10B981';
const roleColor = (r: Role) => (r === 'admin' ? VIOLET : CYAN);

const ROLE_META: Record<Role, { label: string; blurb: string; perms: string[] }> = {
  admin: {
    label: 'Admin',
    blurb: 'Full access + team management',
    perms: ['Full dashboard access', 'Trigger ingestion & classify', 'Manage team & seats', 'Delete leads (GDPR)', 'All settings & billing'],
  },
  viewer: {
    label: 'Viewer',
    blurb: 'Read-only dashboard access',
    perms: ['View dashboard, leads & signals', 'View pipeline status', 'Read-only — no edits or exports'],
  },
};

/* ── Icons (inline SVG, no emoji) ─────────────────────────────────────────────── */
const Icon = {
  bolt:  (c: string) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" /></svg>,
  eye:   (c: string) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>,
  check: (c: string) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  plus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 10-3-3" /></svg>,
};

/* ── Invite / Edit Modal ───────────────────────────────────────────────────────── */

function UserModal({
  mode, initial, seatsRemaining, onClose, onSave,
}: {
  mode: 'create' | 'edit';
  initial?: AdminUser;
  seatsRemaining: number | null;
  onClose: () => void;
  onSave: (d: any) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initial?.role ?? 'viewer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const atLimit = mode === 'create' && seatsRemaining !== null && seatsRemaining <= 0;

  const submit = async () => {
    if (!name.trim() || !email.trim()) return setError('Name and email are required.');
    if (mode === 'create' && password.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true); setError('');
    try {
      const p: any = { name, email, role };
      if (password) p.password = password;
      await onSave(p);
    } catch (e: any) {
      setError(e?.message || e?.response?.data?.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const inp = 'w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 border transition-colors focus:outline-none';
  const inpStyle = { background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)' } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,8,15,0.86)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: 'var(--a-border)' }}>
          <div>
            <p className="font-bold text-white">{mode === 'create' ? 'Invite teammate' : 'Edit teammate'}</p>
            <p className="mt-0.5 text-xs text-white/35">
              {mode === 'create'
                ? seatsRemaining === null ? 'Unlimited seats on your plan' : `${seatsRemaining} seat${seatsRemaining === 1 ? '' : 's'} remaining on your plan`
                : 'Update name, role, or reset password'}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/5 hover:text-white/70" aria-label="Close">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {atLimit ? (
          <div className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${VIOLET}1f`, color: VIOLET }}>{Icon.users}</div>
            <div>
              <p className="font-semibold text-white">You&apos;ve reached your seat limit</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-white/50">Upgrade your plan to add more teammates. Each module adds 3 seats.</p>
            </div>
            <Link href="/admin/subscription" className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110" style={{ background: `linear-gradient(135deg, ${VIOLET}, #5B4FE8)` }}>
              View plans
            </Link>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t-fg-35)' }}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className={inp} style={inpStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t-fg-35)' }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" disabled={mode === 'edit'} className={`${inp} disabled:cursor-not-allowed disabled:opacity-40`} style={inpStyle} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t-fg-35)' }}>
                Password {mode === 'edit' && <span className="font-normal normal-case tracking-normal text-white/25">— leave blank to keep current</span>}
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'create' ? 'Minimum 8 characters' : '••••••••'} className={inp} style={inpStyle} autoComplete="new-password" />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t-fg-35)' }}>Role</label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['admin', 'viewer'] as Role[]).map((r) => {
                  const on = role === r; const ac = roleColor(r);
                  return (
                    <button key={r} onClick={() => setRole(r)} className="rounded-xl border p-4 text-left transition-all duration-150" style={{ background: on ? `${ac}12` : 'var(--t-fg-02)', borderColor: on ? `${ac}55` : 'var(--a-border)' }}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: on ? ac : 'var(--t-fg-40)' }}>
                          {r === 'admin' ? Icon.bolt(on ? ac : 'var(--t-fg-40)') : Icon.eye(on ? ac : 'var(--t-fg-40)')}
                          {ROLE_META[r].label}
                        </span>
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2" style={{ borderColor: on ? ac : 'var(--t-fg-25)' }}>
                          {on && <span className="h-1.5 w-1.5 rounded-full" style={{ background: ac }} />}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-white/40">{ROLE_META[r].blurb}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-400" role="alert">{error}</p>}

            <div className="flex gap-2.5 pt-1">
              <button onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm text-white/40 transition-all hover:text-white/70" style={{ borderColor: 'var(--a-border)' }}>Cancel</button>
              <button onClick={submit} disabled={saving} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50" style={{ flex: 2, background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})` }}>
                {saving ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Saving…</> : mode === 'create' ? 'Send invite' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Seat usage meter ─────────────────────────────────────────────────────────── */

function SeatMeter({ seats }: { seats: Seats }) {
  const unlimited = seats.limit === null;
  const pct = !unlimited && seats.limit! > 0 ? Math.min(100, Math.round((seats.used / seats.limit!) * 100)) : 0;
  const full = !unlimited && seats.remaining !== null && seats.remaining <= 0;
  const near = !unlimited && !full && seats.remaining !== null && seats.remaining <= 1;
  const barColor = full ? '#ef4444' : near ? '#F59E0B' : VIOLET;
  const planLabel = seats.tier ? seats.tier.charAt(0).toUpperCase() + seats.tier.slice(1) : 'Basic';

  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', boxShadow: 'var(--t-card-shadow)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: 'var(--t-fg-35)', fontFamily: 'var(--t-mono-font)' }}>Team seats</span>
          <span className="text-[22px] font-black tabular-nums" style={{ color: 'var(--t-fg-95)' }}>
            {unlimited ? `${seats.used}` : seats.used}
            <span className="text-white/30"> / {unlimited ? 'Unlimited' : seats.limit}</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: `${VIOLET}14`, color: VIOLET, border: `1px solid ${VIOLET}33` }}>
          {planLabel}
        </span>
      </div>

      {!unlimited && (
        <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--t-fg-08)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: full ? '#ef4444' : `linear-gradient(90deg, ${VIOLET}, ${CYAN})` }} />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px]" style={{ color: full ? '#ef4444' : near ? '#F59E0B' : 'var(--t-fg-40)' }}>
          {unlimited
            ? 'Unlimited seats on Max.'
            : full ? 'All seats in use — upgrade to invite more.' : `${seats.remaining} seat${seats.remaining === 1 ? '' : 's'} remaining on your plan`}
        </p>
        {!unlimited && (
          <Link href="/admin/subscription" className="text-[12px] font-semibold transition-colors hover:underline" style={{ color: barColor }}>
            {full || near ? 'Upgrade for more seats →' : 'Manage plan →'}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────────── */

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [seats, setSeats] = useState<Seats>({ used: 0, limit: 1, remaining: 1, modules: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; user: AdminUser }>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Current user (for role gating + self-action guards).
  const [me, setMe] = useState<{ id: string; role: Role } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('synq_admin_user');
      if (raw) { const u = JSON.parse(raw); setMe({ id: u.id ?? u.sub, role: u.role === 'admin' ? 'admin' : 'viewer' }); }
    } catch { /* ignore */ }
  }, []);
  const isAdmin = me?.role === 'admin';

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3400); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getUsers();
      const data: any = r.data;
      setUsers((data.users ?? []).map((u: any) => ({ ...u, is_active: !!u.is_active })));
      if (data.seats) setSeats(data.seats);
    } catch { notify('Failed to load team', false); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (d: any) => { await adminApi.createUser(d); await load(); setModal(null); notify('Invite sent'); };
  const handleEdit = async (d: any) => {
    if (modal?.mode !== 'edit') return;
    await adminApi.updateUser(modal.user.id, d); await load(); setModal(null); notify('Teammate updated');
  };
  const handleToggle = async (u: AdminUser) => {
    try { await adminApi.updateUser(u.id, { is_active: !u.is_active }); await load(); notify(u.is_active ? 'Access revoked' : 'Access restored'); }
    catch (e: any) { notify(e?.message || 'Update failed', false); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await adminApi.deleteUser(deleteTarget.id); await load(); setDeleteTarget(null); notify('Teammate removed'); }
    catch (e: any) { notify(e?.message || 'Cannot remove', false); setDeleteTarget(null); }
  };

  const seatsAvailable = seats.remaining === null || seats.remaining > 0;
  const canInvite = isAdmin && seatsAvailable;
  const inviteDisabledReason = !isAdmin ? 'Only admins can invite' : !seatsAvailable ? 'Seat limit reached — upgrade your plan' : '';

  const stats = [
    { label: 'Members', val: users.length,                            color: VIOLET },
    { label: 'Admins',  val: users.filter((u) => u.role === 'admin').length, color: CYAN },
    { label: 'Viewers', val: users.filter((u) => u.role === 'viewer').length, color: '#A78BFA' },
    { label: 'Active',  val: users.filter((u) => u.is_active).length, color: MINT },
  ];

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-medium shadow-2xl"
          style={{ background: toast.ok ? `${MINT}14` : 'rgba(239,68,68,0.12)', borderColor: toast.ok ? `${MINT}44` : 'rgba(239,68,68,0.3)', color: toast.ok ? MINT : '#f87171' }} role="status">
          {toast.ok ? Icon.check(MINT) : <span>✕</span>} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 lg:px-6"
        style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', boxShadow: 'var(--t-card-shadow)' }}>
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: VIOLET, fontFamily: 'var(--t-mono-font)' }}>06 · Team access</p>
          <h1 className="text-[22px] font-black tracking-tight" style={{ color: 'var(--t-fg-95)' }}>Team</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--t-fg-40)' }}>Invite teammates and manage their access to this workspace</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setModal({ mode: 'create' })}
            disabled={!canInvite}
            title={inviteDisabledReason}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})` }}
          >
            {Icon.plus} Invite teammate
          </button>
          {!canInvite && inviteDisabledReason && (
            <span className="text-[11px]" style={{ color: !seatsAvailable ? '#F59E0B' : 'var(--t-fg-35)' }}>{inviteDisabledReason}</span>
          )}
        </div>
      </div>

      {/* ── Seat usage meter ── */}
      <SeatMeter seats={seats} />

      {/* Viewer read-only note */}
      {me && !isAdmin && (
        <div className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px]" style={{ background: `${CYAN}0d`, borderColor: `${CYAN}30`, color: 'var(--t-fg-55)' }}>
          {Icon.eye(CYAN)} You have <span className="font-semibold" style={{ color: CYAN }}>Viewer</span> access — team management is read-only. Ask an admin to make changes.
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="flex flex-col gap-5 lg:flex-row">

        {/* Left — table */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Stats chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            {stats.map((c) => (
              <div key={c.label} className="flex items-center gap-2 rounded-xl border px-3.5 py-1.5" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
                <span className="text-sm font-bold tabular-nums" style={{ color: c.color }}>{c.val}</span>
                <span className="text-xs text-white/40">{c.label}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
            <div className="grid gap-4 border-b px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white/30" style={{ borderColor: 'var(--a-border)', gridTemplateColumns: '1fr 110px 110px 120px 96px' }}>
              <div>Member</div><div>Role</div><div>Status</div><div>Joined</div><div className="text-right">Actions</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="h-7 w-7 animate-spin rounded-full border-2" style={{ borderColor: 'var(--t-fg-08)', borderTopColor: VIOLET }} /></div>
            ) : users.length === 0 ? (
              <div className="py-20 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white/25" style={{ background: 'var(--t-fg-04)' }}>{Icon.users}</div>
                <p className="text-sm text-white/40">No teammates yet</p>
                <p className="mt-1 text-xs text-white/25">Invite your first teammate to collaborate</p>
              </div>
            ) : (
              <div>
                {users.map((u, i) => {
                  const ac = roleColor(u.role);
                  const initials = u.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                  const isSelf = me?.id === u.id;
                  return (
                    <div key={u.id} className="grid items-center gap-4 px-6 py-4 transition-colors hover:bg-white/[0.015]" style={{ gridTemplateColumns: '1fr 110px 110px 120px 96px', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ background: `${ac}1f`, color: ac }}>{initials}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{u.name}{isSelf && <span className="ml-1.5 text-[10px] font-normal text-white/30">(you)</span>}</p>
                          <p className="truncate text-xs text-white/40">{u.email}</p>
                        </div>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ background: `${ac}14`, color: ac, border: `1px solid ${ac}33` }}>
                          {u.role === 'admin' ? Icon.bolt(ac) : Icon.eye(ac)}{ROLE_META[u.role].label}
                        </span>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium" style={u.is_active ? { background: `${MINT}14`, borderColor: `${MINT}33`, color: MINT } : { background: 'var(--t-fg-04)', borderColor: 'var(--a-border)', color: 'var(--t-fg-35)' }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: u.is_active ? MINT : 'var(--t-fg-25)' }} />{u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div><p className="text-xs" style={{ color: 'var(--t-fg-40)' }}>{fmtDate(u.created_at)}</p></div>
                      <div className="flex items-center justify-end gap-0.5">
                        {isAdmin ? (
                          <>
                            <button onClick={() => handleToggle(u)} disabled={isSelf} title={u.is_active ? 'Revoke access' : 'Restore access'} className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white/5 disabled:opacity-25" style={{ color: u.is_active ? MINT : 'var(--t-fg-25)' }}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                            <button onClick={() => setModal({ mode: 'edit', user: u })} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-white/5 hover:text-white/70">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => setDeleteTarget(u)} disabled={isSelf} title={isSelf ? "You can't remove yourself" : 'Remove'} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/20 transition-all hover:bg-red-500/10 hover:text-red-400 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-white/20">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-white/20">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — role reference */}
        <div className="flex shrink-0 flex-col gap-3 lg:w-72">
          {(['admin', 'viewer'] as Role[]).map((role) => {
            const ac = roleColor(role);
            const count = users.filter((u) => u.role === role).length;
            return (
              <div key={role} className="rounded-2xl border p-5" style={{ background: 'var(--a-card)', borderColor: `${ac}2a` }}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${ac}1f` }}>{role === 'admin' ? Icon.bolt(ac) : Icon.eye(ac)}</div>
                    <span className="text-sm font-bold" style={{ color: ac }}>{ROLE_META[role].label}</span>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums" style={{ background: `${ac}1a`, color: ac }}>{count}</span>
                </div>
                <ul className="space-y-2">
                  {ROLE_META[role].perms.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--t-fg-55)' }}>
                      <span className="mt-0.5 shrink-0">{Icon.check(ac)}</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="rounded-xl border p-4" style={{ background: 'var(--t-fg-02)', borderColor: 'var(--a-border)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--t-fg-40)' }}>
              Teammates sign in on the same login page. Revoking access keeps their account but blocks sign-in. Seats scale with your plan — each module adds 3.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <UserModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? modal.user : undefined}
          seatsRemaining={seats.remaining}
          onClose={() => setModal(null)}
          onSave={modal.mode === 'create' ? handleCreate : handleEdit}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,8,15,0.86)', backdropFilter: 'blur(8px)' }} onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-2xl p-6" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-white">Remove {deleteTarget.name}?</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/45">Their access is permanently revoked and their seat is freed. This cannot be undone.</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border py-2.5 text-sm text-white/45 transition-all hover:text-white/70" style={{ borderColor: 'var(--a-border)' }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 rounded-xl border border-red-500/30 bg-red-500/12 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
