'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { pipelineApi } from '@/lib/api';
import LostReasonModal from '@/components/admin/LostReasonModal';

/* ── Types ──────────────────────────────────────────────────────────────── */
type Stage = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

interface PipelineItem {
  id: string; // signal id (lead id)
  pipeline_id: string;
  first_name: string;
  email: string;
  phone_number: string;
  income_goal: string;
  summary: string | null;
  source: string;
  source_tool: string;
  stage: Stage;
  value: number | null;
  owner_user_id: string | null;
  notes: string | null;
  lost_reason: string | null;
  follow_up_at: string | null;
  stage_changed_at: string;
  created_at: string;
}

interface Stats {
  counts: Record<Stage, number>;
  winRate: number;
  wonValue: number;
  openValue: number;
  avgCycleDays: number;
  overdueFollowups: number;
}

/* ── Theme ──────────────────────────────────────────────────────────────── */
const VIOLET = '#6D5EF9', MINT = '#21F2A6', AMBER = '#FFB547', RED = '#EF4444', BLUE = '#4F8AFF';
const AXIS = '#94A3B8';
const GRID = 'rgba(148,163,184,0.16)';

const STAGE_META: Record<Stage, { label: string; color: string }> = {
  new:       { label: 'New',       color: '#7C8698' },
  contacted: { label: 'Contacted', color: BLUE },
  qualified: { label: 'Qualified', color: VIOLET },
  won:       { label: 'Won',       color: MINT },
  lost:      { label: 'Lost',      color: RED },
};
const STAGES: Stage[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

const emptyStats: Stats = { counts: { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 }, winRate: 0, wonValue: 0, openValue: 0, avgCycleDays: 0, overdueFollowups: 0 };

function fmt(n: number) { return n.toLocaleString(); }
function fmtMoney(n: number) { return n > 0 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '$0'; }
function isOverdue(item: PipelineItem): boolean {
  return !!item.follow_up_at && new Date(item.follow_up_at).getTime() < Date.now() && item.stage !== 'won' && item.stage !== 'lost';
}

/* ── Small primitives ──────────────────────────────────────────────────── */
function Card({ children, className = '', pad = 'p-5' }: { children: React.ReactNode; className?: string; pad?: string }) {
  return (
    <div className={`rounded-2xl border ${pad} ${className}`} style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
      {children}
    </div>
  );
}
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-[11px] shadow-lg" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}>
      {label && <p className="mb-0.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? 'var(--a-text-60)' }}>{fmt(Number(p.value ?? 0))}</p>
      ))}
    </div>
  );
}
function Kpi({ label, value, icon, accent, sub, subColor }: { label: string; value: string; icon: string; accent: string; sub?: string; subColor?: string }) {
  return (
    <Card pad="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}1f`, color: accent }}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </span>
      </div>
      <p className="text-[24px] font-semibold leading-none tabular-nums" style={{ color: 'var(--a-text)' }}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px]" style={{ color: subColor ?? 'var(--a-text-40)' }}>{sub}</p>}
    </Card>
  );
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wonModal, setWonModal] = useState<PipelineItem | null>(null);
  const [wonValue, setWonValue] = useState('');
  const [lostModal, setLostModal] = useState<PipelineItem | null>(null);
  const [editItem, setEditItem] = useState<PipelineItem | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      pipelineApi.list({ q: search || undefined }).then((r) => r.data),
      pipelineApi.stats().then((r) => r.data),
    ]).then(([listRes, statsRes]) => {
      setItems(listRes?.items ?? []);
      setStats(statsRes ?? emptyStats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const byStage = useMemo(() => {
    const out: Record<Stage, PipelineItem[]> = { new: [], contacted: [], qualified: [], won: [], lost: [] };
    for (const it of items) out[it.stage]?.push(it);
    return out;
  }, [items]);

  const funnelData = STAGES.map((s) => ({ label: STAGE_META[s].label, value: stats.counts[s] ?? 0, color: STAGE_META[s].color }));

  const applyStageChange = useCallback(async (item: PipelineItem, stage: Stage, extra?: { lost_reason?: string; value?: number }) => {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, stage, ...(extra?.value !== undefined ? { value: extra.value } : {}), ...(extra?.lost_reason ? { lost_reason: extra.lost_reason } : {}) } : it)));
    try {
      await pipelineApi.update(item.id, { stage, ...(extra?.lost_reason ? { lost_reason: extra.lost_reason } : {}), ...(extra?.value !== undefined ? { value: extra.value } : {}) });
    } finally {
      load();
    }
  }, [load]);

  const onStagePick = (item: PipelineItem, stage: Stage) => {
    if (stage === item.stage) return;
    if (stage === 'won') { setWonModal(item); setWonValue(item.value != null ? String(item.value) : ''); return; }
    if (stage === 'lost') { setLostModal(item); return; }
    applyStageChange(item, stage);
  };

  const confirmWon = () => {
    if (!wonModal) return;
    const v = parseFloat(wonValue);
    applyStageChange(wonModal, 'won', { value: Number.isFinite(v) ? v : undefined });
    setWonModal(null);
  };
  const confirmLost = (reason: string) => {
    if (!lostModal) return;
    applyStageChange(lostModal, 'lost', { lost_reason: reason });
    setLostModal(null);
  };

  const openEdit = (item: PipelineItem) => {
    setEditItem(item);
    setEditNotes(item.notes ?? '');
    setEditValue(item.value != null ? String(item.value) : '');
    setEditFollowUp(item.follow_up_at ? item.follow_up_at.slice(0, 10) : '');
  };
  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const v = editValue.trim() ? parseFloat(editValue) : null;
    try {
      await pipelineApi.update(editItem.id, {
        notes: editNotes.trim() || null,
        value: v !== null && Number.isFinite(v) ? v : null,
        follow_up_at: editFollowUp ? new Date(editFollowUp).toISOString() : null,
      });
      setEditItem(null);
      load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: VIOLET }}>Sales</p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--a-text)' }}>Pipeline</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--a-text-50)' }}>Every lead, tracked from new to closed.</p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color: 'var(--a-text-40)' }}>search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-64 rounded-xl border py-2 pl-9 pr-3.5 text-sm outline-none"
            style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Win rate" value={`${Math.round(stats.winRate * 100)}%`} icon="emoji_events" accent={MINT} sub={`${stats.counts.won} won · ${stats.counts.lost} lost`} />
        <Kpi label="Open pipeline value" value={fmtMoney(stats.openValue)} icon="payments" accent={VIOLET} sub={`${stats.counts.new + stats.counts.contacted + stats.counts.qualified} open deals`} />
        <Kpi label="Won value" value={fmtMoney(stats.wonValue)} icon="celebration" accent={MINT} sub={`avg ${stats.avgCycleDays}d to close`} />
        <Kpi
          label="Overdue follow-ups"
          value={fmt(stats.overdueFollowups)}
          icon="notifications_active"
          accent={stats.overdueFollowups > 0 ? RED : AMBER}
          sub={stats.overdueFollowups > 0 ? 'Needs attention' : 'All caught up'}
          subColor={stats.overdueFollowups > 0 ? RED : undefined}
        />
      </div>

      {/* Funnel chart */}
      <Card className="mb-5">
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--a-text)' }}>Funnel</p>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--a-hover2)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                {funnelData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Kanban */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {STAGES.map((s) => <div key={s} className="h-64 animate-pulse rounded-2xl" style={{ background: 'var(--a-hover2)' }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage} className="rounded-2xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
              <div className="flex items-center justify-between border-b px-3.5 py-3" style={{ borderColor: 'var(--a-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: STAGE_META[stage].color }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--a-text)' }}>{STAGE_META[stage].label}</span>
                </div>
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--a-text-40)' }}>{byStage[stage].length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2.5">
                {byStage[stage].length === 0 ? (
                  <p className="py-8 text-center text-[11px]" style={{ color: 'var(--a-text-30)' }}>Empty</p>
                ) : byStage[stage].map((item) => {
                  const overdue = isOverdue(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => openEdit(item)}
                      className="cursor-pointer rounded-xl border p-3 transition-colors hover:border-[var(--a-border2)]"
                      style={{ background: 'var(--a-input-bg)', borderColor: overdue ? RED : 'var(--a-border)' }}
                    >
                      <p className="truncate text-[13px] font-medium" style={{ color: 'var(--a-text)' }}>{item.first_name || 'Unnamed lead'}</p>
                      <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--a-text-50)' }}>{item.income_goal || item.summary || item.source_tool}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[12px] font-medium tabular-nums" style={{ color: item.value ? 'var(--a-text)' : 'var(--a-text-30)' }}>
                          {item.value ? fmtMoney(item.value) : '—'}
                        </span>
                        {overdue && (
                          <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${RED}1f`, color: RED }}>
                            <span className="material-symbols-outlined text-[12px]">schedule</span>Overdue
                          </span>
                        )}
                      </div>
                      <select
                        value={item.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onStagePick(item, e.target.value as Stage)}
                        className="mt-2 w-full rounded-lg border px-2 py-1.5 text-[11px] outline-none"
                        style={{ background: 'var(--a-card)', borderColor: 'var(--a-border2)', color: 'var(--a-text-80)' }}
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Won modal */}
      {wonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(3,8,15,0.60)', backdropFilter: 'blur(4px)' }} onClick={(e) => { if (e.target === e.currentTarget) setWonModal(null); }}>
          <div className="w-full max-w-[380px] rounded-2xl p-6" style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)' }}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${MINT}18`, color: MINT }}>
              <span className="material-symbols-outlined text-[24px]">celebration</span>
            </span>
            <h2 className="text-[16px] font-bold" style={{ color: 'var(--a-text)' }}>Mark {wonModal.first_name || 'this lead'} as Won 🎉</h2>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--a-text-60)' }}>Confirm the final deal value.</p>
            <label className="mt-4 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Deal value ($)</label>
            <input
              type="number"
              value={wonValue}
              onChange={(e) => setWonValue(e.target.value)}
              placeholder="0"
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
              style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
            />
            <div className="mt-5 flex gap-2.5">
              <button onClick={() => setWonModal(null)} className="min-h-11 flex-1 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--a-hover2)', color: 'var(--a-text-80)' }}>Cancel</button>
              <button onClick={confirmWon} className="min-h-11 flex-1 rounded-xl text-[13px] font-semibold text-white" style={{ background: MINT }}>Confirm Won</button>
            </div>
          </div>
        </div>
      )}

      {/* Lost modal */}
      <LostReasonModal
        open={!!lostModal}
        leadName={lostModal?.first_name || undefined}
        onConfirm={confirmLost}
        onCancel={() => setLostModal(null)}
      />

      {/* Edit drawer */}
      {editItem && (
        <div className="fixed inset-0 z-[90] flex justify-end" style={{ background: 'rgba(3,8,15,0.55)' }} onClick={(e) => { if (e.target === e.currentTarget) setEditItem(null); }}>
          <div className="h-full w-full max-w-[400px] overflow-y-auto p-6" style={{ background: 'var(--a-surface)', borderLeft: '1px solid var(--a-border)' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--a-text-40)' }}>Edit lead</p>
              <button onClick={() => setEditItem(null)} style={{ color: 'var(--a-text-40)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <h3 className="text-[18px] font-bold" style={{ color: 'var(--a-text)' }}>{editItem.first_name || 'Unnamed lead'}</h3>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--a-text-50)' }}>{editItem.email || editItem.phone_number || 'No contact yet'}</p>

            <label className="mt-5 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Deal value ($)</label>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
              style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
            />

            <label className="mt-4 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Follow-up date</label>
            <input
              type="date"
              value={editFollowUp}
              onChange={(e) => setEditFollowUp(e.target.value)}
              className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none"
              style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
            />

            <label className="mt-4 block text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={5}
              placeholder="Call notes, next steps…"
              className="mt-1.5 w-full resize-none rounded-xl border px-3 py-2.5 text-[13px] outline-none"
              style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
            />

            {editItem.lost_reason && (
              <p className="mt-4 rounded-xl border px-3 py-2.5 text-[12px]" style={{ borderColor: `${RED}40`, background: `${RED}0f`, color: RED }}>
                Lost reason: {editItem.lost_reason}
              </p>
            )}

            <button
              onClick={saveEdit}
              disabled={saving}
              className="mt-6 min-h-11 w-full rounded-xl text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: VIOLET }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
