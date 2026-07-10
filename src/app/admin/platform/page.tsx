'use client';

import { useCallback, useEffect, useState } from 'react';

/* ── Types ────────────────────────────────────────────────────────────────── */
type Tier = 'basic' | 'pro' | 'max';

interface OrgRow {
  orgId: string;
  ownerName: string;
  ownerEmail: string;
  companyName: string | null;
  website: string | null;
  members: number;
  tier: Tier | null;
  grantKind: 'subscription' | 'credit' | 'trial' | null;
  validUntil: string | null;
  active: boolean;
  expired: boolean;
  crawlingActive: boolean | null;
}

const TIERS: Tier[] = ['basic', 'pro', 'max'];
const VIOLET = '#6D5EF9';
const MINT = '#21F2A6';
const AMBER = '#FFB547';
const RED = '#FF7A7A';

function authHeaders(json = false): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function daysLeft(validUntil: string | null): number | null {
  if (!validUntil) return null;
  return Math.ceil((new Date(validUntil).getTime() - Date.now()) / 86_400_000);
}

/* ── Access badge ─────────────────────────────────────────────────────────── */
function AccessBadge({ o }: { o: OrgRow }) {
  let color = 'var(--t-fg-35)', bg = 'var(--t-fg-04)', label = 'No plan';
  if (o.active && o.grantKind === 'credit') {
    const d = daysLeft(o.validUntil);
    color = AMBER; bg = `${AMBER}14`; label = d != null ? `Credit · ${d}d left` : 'Credit';
  } else if (o.active) {
    color = MINT; bg = `${MINT}14`; label = 'Active';
  } else if (o.expired) {
    color = RED; bg = `${RED}14`; label = 'Expired';
  }
  return <span className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium" style={{ background: bg, borderColor: `${color}33`, color }}>{label}</span>;
}

/* ── Grant modal (assign subscription / credit) ───────────────────────────── */
function GrantModal({ org, onClose, onDone }: { org: OrgRow; onClose: () => void; onDone: () => void }) {
  const [tier, setTier] = useState<Tier>(org.tier ?? 'pro');
  const [days, setDays] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const d = parseInt(days, 10);
      const res = await fetch(`/api/super/orgs/${org.orgId}`, {
        method: 'PATCH', headers: authHeaders(true),
        body: JSON.stringify({ action: 'grant', tier, days: Number.isFinite(d) && d > 0 ? d : undefined }),
      });
      if (!res.ok) { setErr((await res.json().catch(() => ({})))?.message || 'Failed.'); return; }
      onDone(); onClose();
    } catch { setErr('Network error.'); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)' }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b px-6 py-5" style={{ borderColor: 'var(--a-border)' }}>
          <h3 className="text-[15px] font-semibold text-white">Assign access · {org.companyName ?? org.ownerEmail}</h3>
          <p className="mt-1 text-[12px] text-white/40">Pick a plan. Set days for a time-boxed credit, or leave blank for an ongoing subscription.</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => (
              <button key={t} onClick={() => setTier(t)} className="rounded-xl border py-2.5 text-sm font-medium capitalize transition-all"
                style={{ background: tier === t ? `${VIOLET}18` : 'var(--t-fg-02)', borderColor: tier === t ? `${VIOLET}66` : 'var(--a-border)', color: tier === t ? '#fff' : 'var(--t-fg-55)' }}>{t}</button>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-white/55">Credit duration (days)</label>
            <input value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 2 — blank = ongoing subscription"
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)' }} />
          </div>
          {err && <p className="text-[12px] text-red-400">{err}</p>}
        </div>
        <div className="flex gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--a-border)' }}>
          <button onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm text-white/40 hover:text-white/70" style={{ borderColor: 'var(--a-border)' }}>Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: VIOLET }}>{busy ? 'Saving…' : 'Assign'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Create-organization modal ────────────────────────────────────────────── */
function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ ownerName: '', ownerEmail: '', password: '', companyName: '', website: '', tier: 'pro' as Tier, days: '', referredByCode: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const d = parseInt(f.days, 10);
      const res = await fetch('/api/super/orgs', {
        method: 'POST', headers: authHeaders(true),
        body: JSON.stringify({
          ownerName: f.ownerName, ownerEmail: f.ownerEmail, password: f.password,
          companyName: f.companyName, website: f.website,
          grant: { tier: f.tier, days: Number.isFinite(d) && d > 0 ? d : undefined },
          referredByCode: f.referredByCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.message || 'Failed to create.'); return; }
      setCreated(data.credentials);
      onDone();
    } catch { setErr('Network error.'); } finally { setBusy(false); }
  };

  const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm text-white outline-none';
  const inpStyle = { background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)' } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)' }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b px-6 py-5" style={{ borderColor: 'var(--a-border)' }}>
          <h3 className="text-[15px] font-semibold text-white">{created ? 'Organization created' : 'Create organization'}</h3>
        </div>

        {created ? (
          <div className="space-y-4 px-6 py-6">
            <p className="text-[13px] text-white/70">Share these login credentials with the org owner. They can change the password after signing in.</p>
            <div className="rounded-xl border p-4 text-sm" style={{ background: 'var(--t-fg-02)', borderColor: 'var(--a-border)' }}>
              <div className="flex justify-between py-1"><span className="text-white/40">Email</span><span className="font-medium text-white">{created.email}</span></div>
              <div className="flex justify-between py-1"><span className="text-white/40">Password</span><span className="font-mono font-medium text-white">{created.password}</span></div>
            </div>
            <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: VIOLET }}>Done</button>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <input className={inp} style={inpStyle} placeholder="Owner name" value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} />
                <input className={inp} style={inpStyle} placeholder="Owner email" value={f.ownerEmail} onChange={(e) => setF({ ...f, ownerEmail: e.target.value })} />
              </div>
              <input className={inp} style={inpStyle} placeholder="Temporary password (min 8 chars)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className={inp} style={inpStyle} placeholder="Company name" value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} />
                <input className={inp} style={inpStyle} placeholder="Website (optional)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
              </div>
              <input className={inp} style={inpStyle} placeholder="Referred by code (optional)" value={f.referredByCode} onChange={(e) => setF({ ...f, referredByCode: e.target.value })} />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-white/45">Initial plan</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TIERS.map((t) => (
                      <button key={t} onClick={() => setF({ ...f, tier: t })} className="rounded-lg border py-2 text-xs font-medium capitalize"
                        style={{ background: f.tier === t ? `${VIOLET}18` : 'var(--t-fg-02)', borderColor: f.tier === t ? `${VIOLET}66` : 'var(--a-border)', color: f.tier === t ? '#fff' : 'var(--t-fg-55)' }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-white/45">Credit days (blank = subscription)</label>
                  <input className={inp} style={inpStyle} placeholder="e.g. 2" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value.replace(/[^0-9]/g, '') })} />
                </div>
              </div>
              {err && <p className="text-[12px] text-red-400">{err}</p>}
            </div>
            <div className="flex gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--a-border)' }}>
              <button onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm text-white/40 hover:text-white/70" style={{ borderColor: 'var(--a-border)' }}>Cancel</button>
              <button onClick={submit} disabled={busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: VIOLET }}>{busy ? 'Creating…' : 'Create organization'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function PlatformConsole() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [grantFor, setGrantFor] = useState<OrgRow | null>(null);

  const load = useCallback(() => {
    fetch('/api/super/orgs', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { orgs: [] }))
      .then((d: { orgs?: OrgRow[] }) => setOrgs(d.orgs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Sync every org's crawl kill-switch with its access state, then load.
    fetch('/api/super/enforce', { method: 'POST', headers: authHeaders() }).catch(() => {}).finally(load);
  }, [load]);

  const suspend = async (o: OrgRow) => {
    await fetch(`/api/super/orgs/${o.orgId}`, { method: 'PATCH', headers: authHeaders(true), body: JSON.stringify({ action: 'suspend' }) }).catch(() => {});
    load();
  };

  const reactivate = async (o: OrgRow) => {
    await fetch(`/api/super/orgs/${o.orgId}`, { method: 'PATCH', headers: authHeaders(true), body: JSON.stringify({ action: 'reactivate' }) }).catch(() => {});
    load();
  };

  const stats = {
    total: orgs.length,
    active: orgs.filter((o) => o.active).length,
    expired: orgs.filter((o) => o.expired).length,
    crawling: orgs.filter((o) => o.crawlingActive).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: VIOLET }}>Platform</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Organizations</h1>
          <p className="mt-1 text-sm text-white/45">Create organizations, assign subscriptions, grant time-boxed credits, and control crawling.</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: VIOLET }}>
          <span className="material-symbols-outlined text-[18px]">add</span> Create organization
        </button>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Organizations', value: stats.total, color: '#fff' },
          { label: 'Active', value: stats.active, color: MINT },
          { label: 'Expired', value: stats.expired, color: RED },
          { label: 'Crawling', value: stats.crawling, color: VIOLET },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
            <p className="text-[11px] uppercase tracking-wider text-white/35">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <div className="grid gap-4 border-b px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white/30" style={{ borderColor: 'var(--a-border)', gridTemplateColumns: '1.4fr 1fr 90px 130px 80px 90px 150px' }}>
          <span>Company</span><span>Owner</span><span>Plan</span><span>Access</span><span>Members</span><span>Crawling</span><span className="text-right">Actions</span>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">Loading organizations…</div>
        ) : orgs.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">No organizations yet. Create one to get started.</div>
        ) : orgs.map((o, i) => (
          <div key={o.orgId} className="grid items-center gap-4 px-6 py-4 hover:bg-white/[0.015]" style={{ gridTemplateColumns: '1.4fr 1fr 90px 130px 80px 90px 150px', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{o.companyName ?? '—'}</p>
              {o.website && <p className="truncate text-[11px] text-white/35">{o.website}</p>}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] text-white/70">{o.ownerName}</p>
              <p className="truncate text-[11px] text-white/35">{o.ownerEmail}</p>
            </div>
            <span className="text-[13px] capitalize text-white/70">{o.tier ?? '—'}</span>
            <AccessBadge o={o} />
            <span className="text-[13px] text-white/60">{o.members}</span>
            <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: o.crawlingActive ? MINT : 'var(--t-fg-35)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: o.crawlingActive ? MINT : 'var(--t-fg-35)' }} />
              {o.crawlingActive == null ? '—' : o.crawlingActive ? 'On' : 'Off'}
            </span>
            <div className="flex justify-end gap-1.5">
              <button onClick={() => setGrantFor(o)} className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium text-white/70 hover:text-white" style={{ borderColor: 'var(--a-border)' }}>Assign</button>
              {o.active && <button onClick={() => suspend(o)} className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium" style={{ borderColor: `${RED}44`, color: RED }}>Suspend</button>}
              {!o.active && o.tier && <button onClick={() => reactivate(o)} className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium" style={{ borderColor: `${MINT}44`, color: MINT }}>Reactivate</button>}
            </div>
          </div>
        ))}
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onDone={load} />}
      {grantFor && <GrantModal org={grantFor} onClose={() => setGrantFor(null)} onDone={load} />}
    </div>
  );
}
