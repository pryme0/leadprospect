'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';
import { getSubscription } from '@/lib/subscription-store';
import LeadDrawer from '@/components/admin/LeadDrawer';

/** Platform accent colors — mirror the Pulse channel colors. */
const PLATFORM_META: Record<string, { label: string; color: string }> = {
  tiktok:    { label: 'TikTok',    color: '#69C9D0' },
  threads:   { label: 'Threads',   color: '#8A8A8E' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  linkedin:  { label: 'LinkedIn',  color: '#0A66C2' },
  x:         { label: 'X',         color: '#71767b' },
  twitter:   { label: 'X',         color: '#71767b' },
  facebook:  { label: 'Facebook',  color: '#1877F2' },
};
/** Platforms we can attempt a real DM for (Unipile). Others are assisted. */
const MESSAGABLE = new Set(['instagram', 'linkedin', 'x', 'twitter']);

type OutreachStatus = 'not_contacted' | 'sent' | 'replied';
interface OutreachRec { status: OutreachStatus; platform: string; channel?: string | null }

interface Lead {
  id: string;
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start: string;
  income_goal: string;
  source_tool: string;
  intent_level: string;
  consented: boolean;
  ghl_contact_id: string | null;
  lead_source: string | null;
  created_at: string;
  // Outreach identity (from toUiLead) — used to reply directly from this page.
  source?: string;
  username?: string | null;
  profile_url?: string | null;
  post_url?: string | null;
  post_content?: string | null;
  summary?: string | null;
  // Sales-pipeline stage (from lead_pipeline, merged in by /api/crawler/leads).
  pipeline_stage?: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | null;
  pipeline_follow_up_at?: string | null;
}

const STAGE_TONE: Record<string, { tone: 'accent' | 'green' | 'gold' | 'blue' | 'red'; label: string }> = {
  new:       { tone: 'accent', label: 'New' },
  contacted: { tone: 'blue',   label: 'Contacted' },
  qualified: { tone: 'gold',   label: 'Qualified' },
  won:       { tone: 'green',  label: 'Won' },
  lost:      { tone: 'red',    label: 'Lost' },
};

function sourceLabel(s: string | null | undefined): { label: string; tone: 'gold' | 'blue' | 'green' } {
  switch (s) {
    case 'cr':
    case 'crawler':  return { label: 'Agent Crawler', tone: 'gold' };
    case 'so':
    case 'social':   return { label: 'Social Media',  tone: 'blue' };
    default:         return { label: 'Website',       tone: 'green' };
  }
}

const LEAD_SOURCES   = ['google-ads', 'meta-ads', 'instagram-ads', 'linkedin-ads', 'crm-import'];
const INTENT_LEVELS  = ['', 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'];

const INTENT_META: Record<string, { label: string; color: string; dimBg: string }> = {
  HIGH_INTENT:   { label: 'High',   color: '#EB4203', dimBg: 'rgba(235,66,3,0.10)'   },
  MEDIUM_INTENT: { label: 'Medium', color: '#FF9C5F', dimBg: 'rgba(255,156,95,0.10)' },
  LOW_INTENT:    { label: 'Low',    color: '#00CEC8', dimBg: 'rgba(0,206,200,0.10)'  },
};

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  'Route now':       { label: 'Route now',       color: '#EB4203', bg: 'rgba(235,66,3,0.12)'    },
  'Consent needed':  { label: 'Consent needed',  color: '#f87171', bg: 'rgba(239,68,68,0.12)'   },
  'Sync pending':    { label: 'Sync pending',    color: '#FF9C5F', bg: 'rgba(255,156,95,0.12)'  },
  'In workflow':     { label: 'In workflow',     color: '#34d399', bg: 'rgba(16,185,129,0.12)'  },
};

function getAction(lead: Lead): keyof typeof ACTION_META {
  if (lead.intent_level === 'HIGH_INTENT' && lead.consented && !lead.ghl_contact_id) return 'Route now';
  if (!lead.consented) return 'Consent needed';
  if (!lead.ghl_contact_id) return 'Sync pending';
  return 'In workflow';
}

function toolLabel(tool: string) {
  return tool.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function LeadsPage() {
  const theme = useWorkspaceTheme();
  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [filters,     setFilters]     = useState({ source_tool: '', intent_level: '', outreach: '' });
  const [syncState,   setSyncState]   = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncResult,  setSyncResult]  = useState<{ queued: number } | null>(null);

  // Bulk selection state.
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [bulkAction,  setBulkAction]  = useState<'idle' | 'working'>('idle');

  // Duplicate detection.
  const [dupeCount,   setDupeCount]   = useState(0);

  // Outreach / Pulse state.
  const [hasPulse,    setHasPulse]    = useState(false);
  const [connected,   setConnected]   = useState<Set<string>>(new Set());
  const [outreach,    setOutreach]    = useState<Record<string, OutreachRec>>({});
  const [replyLead,   setReplyLead]   = useState<Lead | null>(null);

  // Lead detail drawer.
  const [drawerLead,  setDrawerLead]  = useState<Lead | null>(null);

  // Tags state.
  const [allTags,     setAllTags]     = useState<{ id: string; name: string; color: string }[]>([]);
  const [leadTags,    setLeadTags]    = useState<Record<string, { id: string; name: string; color: string }[]>>({});
  const [tagFilter,   setTagFilter]   = useState<string>('');

  // Pulse subscription (client) + connected social channels.
  useEffect(() => {
    const loadSub = () => setHasPulse((getSubscription()?.modules ?? []).includes('comms'));
    loadSub(); // instant paint from the local cache…
    window.addEventListener('synq:subscription-changed', loadSub);
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (token) {
      // …then reconcile with the SHARED server (Postgres), the source of truth.
      // Without this a stale/empty local cache (e.g. a super-admin-granted plan
      // or a different browser) wrongly shows the "Subscribe to Pulse" banner
      // even though the account already has Pulse (the 'comms' module).
      fetch('/api/subscription/sync', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && Array.isArray(d.modules)) setHasPulse(d.modules.includes('comms')); })
        .catch(() => {});
      fetch('/api/comms/channels', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setConnected(new Set(((d?.connected ?? []) as { channel_id: string }[]).map((c) => c.channel_id))))
        .catch(() => {});
    }
    return () => window.removeEventListener('synq:subscription-changed', loadSub);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filters.source_tool)  params.source_tool  = filters.source_tool;
      if (filters.intent_level) params.intent_level = filters.intent_level;
      const res = await adminApi.getLeads(params);
      setLeads(res.data.leads || res.data.data || []);
      setTotalPages(
        res.data.total_pages || res.data.totalPages || res.data.pagination?.total_pages || 1,
      );
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Load outreach status for the visible leads (drives the Sent/Replied pill + filter).
  const loadOutreach = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (!token || leads.length === 0) return;
    const ids = leads.map((l) => l.id).join(',');
    try {
      const r = await fetch(`/api/outreach?leadIds=${encodeURIComponent(ids)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setOutreach((await r.json()).statuses ?? {});
    } catch { /* ignore */ }
  }, [leads]);
  useEffect(() => { loadOutreach(); }, [loadOutreach]);

  // Check for duplicates on mount.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (!token) return;
    fetch('/api/leads/duplicates', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setDupeCount(d.total ?? 0))
      .catch(() => {});
  }, []);

  // Load tags.
  const loadTags = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (!token) return;
    try {
      const r = await fetch('/api/leads/tags', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setAllTags((await r.json()).tags ?? []);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadTags(); }, [loadTags]);

  // Load tags for current leads.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (!token || leads.length === 0) return;
    const leadIds = leads.map((l) => l.id);
    fetch(`/api/leads/tags/batch?leadIds=${encodeURIComponent(leadIds.join(','))}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setLeadTags(d.tags ?? {}))
      .catch(() => {});
  }, [leads]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleGhlSync = async () => {
    setSyncState('syncing');
    setSyncResult(null);
    try {
      const res = await adminApi.retryGhlSync();
      setSyncResult(res.data);
      setSyncState('done');
      setTimeout(() => fetchLeads(), 3000);
      setTimeout(() => setSyncState('idle'), 6000);
    } catch {
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  const unsyncedCount   = leads.filter((l) => !l.ghl_contact_id).length;
  const highIntentCount = leads.filter((l) => l.intent_level === 'HIGH_INTENT').length;
  const consentedCount  = leads.filter((l) => l.consented).length;
  const syncedCount     = leads.length - unsyncedCount;
  const consentPct      = leads.length ? Math.round((consentedCount / leads.length) * 100) : 0;

  const sourceBreakdown = LEAD_SOURCES
    .map((source) => ({ source, count: leads.filter((l) => l.source_tool === source).length }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  const hasActiveFilters = !!(filters.source_tool || filters.intent_level);

  const stats = [
    { label: 'Total leads',   value: leads.length,   color: theme.accent  },
    { label: 'High intent',   value: highIntentCount, color: '#EB4203'    },
    { label: 'CRM synced',    value: syncedCount,     color: '#10b981'    },
    { label: 'Consent rate',  value: `${consentPct}%`, color: '#FF9C5F'  },
  ];

  // Clear selection when page or filters change.
  useEffect(() => { setSelected(new Set()); }, [page, filters]);

  // Visible leads (after client-side outreach + tag filter).
  const visibleLeads = leads.filter((l) => {
    if (filters.outreach && (outreach[l.id]?.status ?? 'not_contacted') !== filters.outreach) return false;
    if (tagFilter && !(leadTags[l.id] ?? []).some((t) => t.id === tagFilter)) return false;
    return true;
  });

  const allSelected = visibleLeads.length > 0 && visibleLeads.every((l) => selected.has(l.id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleLeads.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkMoveToPipeline = async (stage: 'new' | 'contacted' | 'qualified') => {
    const token = localStorage.getItem('synq_admin_token');
    if (!token || selected.size === 0) return;
    setBulkAction('working');
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      await Promise.all(
        Array.from(selected).map(async (leadId) => {
          // First, ensure the lead is in the pipeline (POST adds to 'new')
          await fetch('/api/pipeline', {
            method: 'POST',
            headers,
            body: JSON.stringify({ leadId }),
          });
          // Then, if target stage is not 'new', update it
          if (stage !== 'new') {
            await fetch(`/api/pipeline/${leadId}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ stage }),
            });
          }
        })
      );
      setSelected(new Set());
      fetchLeads();
    } finally {
      setBulkAction('idle');
    }
  };

  const bulkExport = () => {
    const selectedLeads = leads.filter((l) => selected.has(l.id));
    const csv = [
      ['Name', 'Email', 'Phone', 'Source', 'Intent', 'Pipeline Stage', 'Created'].join(','),
      ...selectedLeads.map((l) =>
        [
          l.first_name || '',
          l.email || '',
          l.phone_number || '',
          l.source_tool || '',
          l.intent_level || '',
          l.pipeline_stage || '',
          l.created_at?.slice(0, 10) || '',
        ].map((v) => `"${v.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkAssignTag = async (tagId: string) => {
    const token = localStorage.getItem('synq_admin_token');
    if (!token || selected.size === 0) return;
    setBulkAction('working');
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      await Promise.all(
        Array.from(selected).map((leadId) =>
          fetch('/api/leads/tags', {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'assign', leadId, tagId }),
          })
        )
      );
      // Reload tags for leads
      const leadIds = leads.map((l) => l.id);
      const r = await fetch(`/api/leads/tags/batch?leadIds=${encodeURIComponent(leadIds.join(','))}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setLeadTags((await r.json()).tags ?? {});
    } finally {
      setBulkAction('idle');
    }
  };

  // Which social platforms appear among these leads, and are any unconnected?
  const leadPlatforms = Array.from(new Set(leads.map((l) => (l.source || '').toLowerCase()).filter((p) => PLATFORM_META[p])));
  const unconnectedPlatforms = leadPlatforms.filter((p) => !connected.has(p) && p !== 'linkedin');
  const showConnectBanner = hasPulse && leads.length > 0 && unconnectedPlatforms.length > 0;

  const openReply = (lead: Lead) => setReplyLead(lead);
  const onSent = (leadId: string, status: OutreachStatus, platform: string) => {
    setOutreach((prev) => ({ ...prev, [leadId]: { status, platform } }));
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">

      {/* ── Pulse outreach banner ── */}
      {!hasPulse ? (
        <div
          className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(109,94,249,0.14), rgba(24,216,255,0.08))', borderColor: 'rgba(109,94,249,0.35)' }}
        >
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#6D5EF9]/20 text-[#6D5EF9]">
              <span className="material-symbols-outlined">forum</span>
            </span>
            <div>
              <p className="text-[15px] font-bold text-white">Reach these leads directly — add Pulse</p>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/60">
                With <span className="font-semibold text-white/85">Pulse</span> you can message every lead here on the
                platform they came from — Instagram, LinkedIn, X and more — with an AI-drafted opener, right from this page.
              </p>
            </div>
          </div>
          <Link
            href="/admin/subscription"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(109,94,249,0.4)] transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #6D5EF9, #5B4FE8)' }}
          >
            Subscribe to Pulse
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>
      ) : showConnectBanner ? (
        <div
          className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(0,226,153,0.12), rgba(24,216,255,0.06))', borderColor: 'rgba(0,226,153,0.30)' }}
        >
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00E299]/20 text-[#00E299]">
              <span className="material-symbols-outlined">link</span>
            </span>
            <div>
              <p className="text-[15px] font-bold text-white">Connect your social accounts to reply</p>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/60">
                You have leads on <span className="font-semibold text-white/85">{unconnectedPlatforms.map((p) => PLATFORM_META[p].label).join(', ')}</span>.
                Connect {unconnectedPlatforms.length > 1 ? 'these accounts' : 'this account'} in Pulse to message them directly.
              </p>
            </div>
          </div>
          <Link
            href="/admin/comms"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-[#0B1020] shadow-[0_4px_20px_rgba(0,226,153,0.35)] transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #00E299, #18D8FF)' }}
          >
            Connect accounts
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>
      ) : null}

      {/* ── Header ── */}
      <header
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          boxShadow: 'var(--t-card-shadow)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6 p-5 lg:p-6">
          {/* Title */}
          <div className="max-w-lg">
            <p
              className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em]"
              style={{ color: theme.accent, fontFamily: theme.fontMono }}
            >
              Leads
            </p>
            <h1 className="text-[26px] font-black leading-tight tracking-tight text-white">
              Leads
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              Scored, attributed, and consent-checked. Route high-intent unsynced records first.
            </p>
          </div>

          {/* Stat tiles */}
          <div className="flex flex-wrap gap-2.5">
            {stats.map(({ label, value, color }) => (
              <div
                key={label}
                className="flex min-w-[88px] flex-col gap-1.5 rounded-xl px-4 py-3"
                style={{
                  background: 'var(--t-fg-05)',
                  border: `1px solid ${color}30`,
                }}
              >
                <p
                  className="text-[8px] font-bold uppercase tracking-[0.28em]"
                  style={{ color, fontFamily: theme.fontMono }}
                >
                  {label}
                </p>
                <p
                  className="text-[26px] font-black leading-none tabular-nums"
                  style={{ color, fontFamily: theme.fontMono }}
                >
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CRM sync footer */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-6"
          style={{ borderTop: '1px solid var(--a-border)' }}
        >
          <p className="text-xs text-white/60">
            CRM status:{' '}
            <span className="font-semibold text-white">
              {unsyncedCount ? `${unsyncedCount} records need sync` : 'all visible records synced'}
            </span>
          </p>
          <button
            onClick={handleGhlSync}
            disabled={syncState === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontFamily: theme.fontMono,
              borderRadius: 'var(--t-radius-sm)',
              background:
                syncState === 'done'  ? 'rgba(16,185,129,0.14)'
                : syncState === 'error' ? 'rgba(239,68,68,0.14)'
                : theme.accent,
              border: `1px solid ${
                syncState === 'done'  ? 'rgba(16,185,129,0.34)'
                : syncState === 'error' ? 'rgba(239,68,68,0.34)'
                : theme.accent
              }`,
              color:
                syncState === 'done'  ? '#34d399'
                : syncState === 'error' ? '#fca5a5'
                : theme.accentOn,
            }}
          >
            {syncState === 'syncing' ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Syncing…
              </>
            ) : syncState === 'done' ? (
              <>✓ Queued {syncResult?.queued ?? 0}</>
            ) : syncState === 'error' ? (
              <>Failed · retry</>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync to CRM
                {unsyncedCount > 0 && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px]"
                    style={{ background: theme.accentOn, color: theme.accent }}
                  >
                    {unsyncedCount}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Duplicate warning ── */}
      {dupeCount > 0 && (
        <div
          className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}
        >
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <span className="text-[13px] text-white/80">
              <strong className="text-orange-400">{dupeCount} potential duplicates</strong> found — leads with matching emails or usernames across sources.
            </span>
          </div>
          <Link
            href="/admin/signals?duplicates=1"
            className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-orange-400 transition-colors hover:bg-orange-400/10"
          >
            Review →
          </Link>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div
        className="flex flex-wrap items-center gap-2"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          padding: '10px 16px',
        }}
      >
        {/* Quick filter presets */}
        <div className="flex items-center gap-1.5 mr-2 pr-3 border-r border-white/10">
          {[
            { label: 'High Intent', filter: { source_tool: '', intent_level: 'HIGH_INTENT', outreach: '' } },
            { label: 'Not Contacted', filter: { source_tool: '', intent_level: '', outreach: 'not_contacted' } },
            { label: 'Replied', filter: { source_tool: '', intent_level: '', outreach: 'replied' } },
          ].map(({ label, filter }) => {
            const isActive = JSON.stringify(filters) === JSON.stringify(filter);
            return (
              <button
                key={label}
                onClick={() => { setFilters(filter); setPage(1); }}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#6D5EF9] text-white'
                    : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
          Filter
        </span>

        {[
          {
            key: 'source_tool',
            label: 'Source',
            value: filters.source_tool,
            options: [{ value: '', label: 'All' }, ...LEAD_SOURCES.map((t) => ({ value: t, label: toolLabel(t) }))],
          },
          {
            key: 'intent_level',
            label: 'Intent',
            value: filters.intent_level,
            options: [{ value: '', label: 'All' }, ...INTENT_LEVELS.filter(Boolean).map((l) => ({ value: l, label: l.replace('_INTENT', '').toLowerCase() }))],
          },
          ...(hasPulse ? [{
            key: 'outreach',
            label: 'Outreach',
            value: filters.outreach,
            options: [{ value: '', label: 'All' }, { value: 'not_contacted', label: 'not contacted' }, { value: 'sent', label: 'sent' }, { value: 'replied', label: 'replied' }],
          }] : []),
        ].map(({ key, label, value, options }) => {
          const active = value !== '';
          return (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all"
              style={{
                background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-04)',
                border: `1px solid ${active ? theme.accent + '50' : 'var(--a-border)'}`,
              }}
            >
              <span
                className="text-[9px] font-bold uppercase tracking-[0.28em]"
                style={{ fontFamily: theme.fontMono, color: active ? theme.accent : 'var(--t-fg-40)' }}
              >
                {label}
              </span>
              <span style={{ color: 'var(--t-fg-15)', fontSize: 10, userSelect: 'none' }}>·</span>
              <select
                value={value}
                onChange={(e) => handleFilterChange(key, e.target.value)}
                className="cursor-pointer bg-transparent text-[12px] font-medium capitalize text-white/80 focus:outline-none"
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#112126]">{o.label}</option>
                ))}
              </select>
            </label>
          );
        })}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <label
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all"
            style={{
              background: tagFilter ? 'var(--t-accent-soft)' : 'var(--t-fg-04)',
              border: `1px solid ${tagFilter ? theme.accent + '50' : 'var(--a-border)'}`,
            }}
          >
            <span
              className="text-[9px] font-bold uppercase tracking-[0.28em]"
              style={{ fontFamily: theme.fontMono, color: tagFilter ? theme.accent : 'var(--t-fg-40)' }}
            >
              Tag
            </span>
            <span style={{ color: 'var(--t-fg-15)', fontSize: 10, userSelect: 'none' }}>·</span>
            <select
              value={tagFilter}
              onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
              className="cursor-pointer bg-transparent text-[12px] font-medium capitalize text-white/80 focus:outline-none"
            >
              <option value="" className="bg-[#112126]">All</option>
              {allTags.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#112126]">{t.name}</option>
              ))}
            </select>
          </label>
        )}

        {(hasActiveFilters || filters.outreach || tagFilter) && (
          <button
            onClick={() => { setFilters({ source_tool: '', intent_level: '', outreach: '' }); setTagFilter(''); setPage(1); }}
            className="ml-auto text-[11px] text-white/30 transition-colors hover:text-white/60"
            style={{ fontFamily: theme.fontMono }}
          >
            Clear ×
          </button>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div
          className="flex flex-wrap items-center gap-3"
          style={{
            background: 'var(--t-accent-soft)',
            border: `1px solid ${theme.accent}40`,
            borderRadius: 'var(--t-radius-lg)',
            padding: '10px 16px',
          }}
        >
          <span className="text-[12px] font-semibold" style={{ color: theme.accent }}>
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => bulkMoveToPipeline('new')}
              disabled={bulkAction === 'working'}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
              style={{ color: theme.accent }}
            >
              → Pipeline (New)
            </button>
            <button
              onClick={() => bulkMoveToPipeline('contacted')}
              disabled={bulkAction === 'working'}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
              style={{ color: theme.accent }}
            >
              → Contacted
            </button>
            <button
              onClick={() => bulkMoveToPipeline('qualified')}
              disabled={bulkAction === 'working'}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
              style={{ color: theme.accent }}
            >
              → Qualified
            </button>
            <button
              onClick={bulkExport}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/10"
              style={{ color: theme.accent }}
            >
              Export Selected
            </button>
            <a
              href="/api/leads/export"
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/10"
              style={{ color: theme.accent }}
            >
              Export All
            </a>
            {allTags.length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) bulkAssignTag(e.target.value); }}
                disabled={bulkAction === 'working'}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{ background: 'transparent', borderColor: theme.accent + '40', color: theme.accent }}
              >
                <option value="" className="bg-[#112126]">+ Add tag</option>
                {allTags.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#112126]">{t.name}</option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[11px] text-white/40 transition-colors hover:text-white/70"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),300px]">

        {/* Lead table */}
        <div
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Column headers */}
          <div
            className="hidden lg:grid items-center px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.26em] text-white/30"
            style={{
              gridTemplateColumns: '32px 140px minmax(0,1fr) 120px 110px 130px',
              borderBottom: '1px solid var(--a-border)',
              background: 'var(--t-fg-03)',
              fontFamily: theme.fontMono,
            }}
          >
            <label className="flex cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-transparent accent-[#6D5EF9]"
              />
            </label>
            <span>Contact</span>
            <span>Source</span>
            <span>Window</span>
            <span>Value</span>
            <span>Action</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }}
              />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div
                className="mb-2 flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'var(--t-fg-04)', border: '1px solid var(--a-border)' }}
              >
                <svg className="h-5 w-5 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <circle cx="9" cy="8" r="3" />
                  <path strokeLinecap="round" d="M3 21v-1a6 6 0 0112 0v1" />
                </svg>
              </div>
              <p className="text-sm text-white/30">No leads match these filters</p>
              <p className="text-[10px] uppercase tracking-widest text-white/20" style={{ fontFamily: theme.fontMono }}>
                Adjust filters above
              </p>
            </div>
          ) : (
            (() => {
              if (visibleLeads.length === 0) {
                return <div className="px-5 py-16 text-center text-sm text-white/30">No leads match these filters</div>;
              }
              return visibleLeads.map((lead, i) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  theme={theme}
                  isLast={i === visibleLeads.length - 1}
                  hasPulse={hasPulse}
                  connected={connected}
                  outreach={outreach[lead.id]}
                  onReply={openReply}
                  isSelected={selected.has(lead.id)}
                  onToggleSelect={() => toggleSelect(lead.id)}
                  onOpenDrawer={() => setDrawerLead(lead)}
                  tags={leadTags[lead.id] ?? []}
                />
              ));
            })()
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid var(--a-border)', background: 'var(--t-fg-02)' }}
            >
              <p className="text-[11px] tabular-nums text-white/30" style={{ fontFamily: theme.fontMono }}>
                Page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <PagBtn onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} theme={theme}>← Prev</PagBtn>
                <PagBtn onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} theme={theme}>Next →</PagBtn>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">

          {/* Source quality */}
          <section
            className="p-4"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
              Source quality
            </p>
            <div className="space-y-3.5">
              {(sourceBreakdown.length
                ? sourceBreakdown
                : [{ source: 'No active sources', count: 0 }]
              ).map((item) => {
                const pct = leads.length ? Math.max(8, (item.count / leads.length) * 100) : 0;
                return (
                  <div key={item.source}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{toolLabel(item.source)}</span>
                      <span className="text-xs tabular-nums text-white/50" style={{ fontFamily: theme.fontMono }}>{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--t-fg-08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${theme.accent}, #FF9C5F)` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Action breakdown */}
          <section
            className="p-4"
            style={{
              background: 'var(--a-card)',
              border: '1px solid var(--a-border)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-white/30" style={{ fontFamily: theme.fontMono }}>
              Queue breakdown
            </p>
            <div className="space-y-2.5">
              {Object.entries(ACTION_META).map(([key, meta]) => {
                const count = leads.filter((l) => getAction(l) === key).length;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-white/70">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-white/60" style={{ fontFamily: theme.fontMono }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Triage rule — pg-on-dark preserves white text in light mode */}
          <section
            className="pg-on-dark p-4"
            style={{
              background: '#112126',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 'var(--t-radius-lg)',
            }}
          >
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: theme.accent, fontFamily: theme.fontMono }}>
              Triage rule
            </p>
            <p className="text-[15px] font-black leading-snug tracking-tight text-white">
              Work high-intent, consented, unsynced records first.
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-white/60">
              Low-intent records stay in nurture unless source quality improves.
            </p>
          </section>
        </aside>
      </div>

      {/* ── Reply drawer ── */}
      {replyLead && (
        <ReplyDrawer
          lead={replyLead}
          theme={theme}
          connected={connected}
          onClose={() => setReplyLead(null)}
          onSent={(status) => { onSent(replyLead.id, status, (replyLead.source || '').toLowerCase()); }}
        />
      )}

      {/* ── Lead detail drawer ── */}
      <LeadDrawer
        lead={drawerLead}
        onClose={() => setDrawerLead(null)}
        token={() => localStorage.getItem('synq_admin_token') ?? ''}
      />
    </div>
  );
}

// ── ReplyDrawer ───────────────────────────────────────────────────────────────

function ReplyDrawer({
  lead, theme, connected, onClose, onSent,
}: {
  lead: Lead;
  theme: ReturnType<typeof useWorkspaceTheme>;
  connected: Set<string>;
  onClose: () => void;
  onSent: (status: OutreachStatus) => void;
}) {
  const platform = (lead.source || '').toLowerCase();
  const pMeta = PLATFORM_META[platform] ?? { label: platform || 'Platform', color: '#6D5EF9' };
  const isConnected = connected.has(platform);
  const messagable = MESSAGABLE.has(platform);
  const [text, setText]       = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending]   = useState(false);
  const [note, setNote]         = useState<string | null>(null);

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null);

  // Auto-generate an AI opener on open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDrafting(true);
      try {
        const r = await fetch('/api/outreach/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ leadId: lead.id }),
        });
        const d = await r.json();
        if (!cancelled && r.ok && d.draft) setText(d.draft);
      } catch { /* ignore */ } finally { if (!cancelled) setDrafting(false); }
    })();
    return () => { cancelled = true; };
  }, [lead.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    setNote(null);
    try {
      const r = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ leadId: lead.id, text: text.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setNote(d.message || 'Send failed.'); setSending(false); return; }
      if (d.assisted) {
        // Copy the draft + open the lead's post/profile so the user sends it there.
        try { await navigator.clipboard.writeText(text.trim()); } catch { /* ignore */ }
        if (d.url) window.open(d.url, '_blank', 'noopener');
        setNote(`Message copied — opened ${pMeta.label}. Paste and send it there.`);
      } else {
        setNote(`Sent on ${pMeta.label}.`);
      }
      onSent('sent');
      setTimeout(onClose, d.assisted ? 1800 : 1000);
    } catch {
      setNote('Network error.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 flex h-full w-full max-w-md flex-col"
        style={{ background: 'var(--a-bg)', borderLeft: '1px solid var(--a-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--a-border)' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: `${pMeta.color}22`, color: pMeta.color }}>
              {(lead.first_name || lead.username || 'LD').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-[15px] font-bold text-white">{lead.first_name || (lead.username ? `@${lead.username}` : 'Lead')}</p>
              <p className="text-[12px]" style={{ color: pMeta.color }}>
                {pMeta.label}{isConnected ? ' · connected' : ''}{lead.username ? ` · @${lead.username}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><span className="material-symbols-outlined">close</span></button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {lead.post_content && (
            <div className="rounded-xl p-3.5 text-[13px] leading-relaxed text-white/70" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Their post</p>
              {String(lead.post_content).slice(0, 400)}
            </div>
          )}
          {!messagable && (
            <div className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed" style={{ background: 'rgba(105,201,208,0.10)', color: '#69C9D0', border: '1px solid rgba(105,201,208,0.3)' }}>
              {pMeta.label} has no direct-message API — we’ll open their post and copy your message so you can send it in one tap.
            </div>
          )}
          {messagable && !isConnected && (
            <div className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed text-white/60" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
              Connect your {pMeta.label} account in <Link href="/admin/comms" className="underline" style={{ color: pMeta.color }}>Pulse</Link> to send this as a real DM. Until then it’s an assisted send.
            </div>
          )}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Your message {drafting && '· drafting…'}</p>
              <button
                onClick={async () => {
                  setDrafting(true);
                  try {
                    const r = await fetch('/api/outreach/draft', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ leadId: lead.id }) });
                    const d = await r.json(); if (r.ok && d.draft) setText(d.draft);
                  } catch { /* ignore */ } finally { setDrafting(false); }
                }}
                className="text-[11px] font-semibold" style={{ color: theme.accent }}
              >
                ✨ Regenerate
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={drafting ? 'Generating a personalized opener…' : 'Write your message…'}
              className="w-full resize-y rounded-xl px-3.5 py-3 text-[13px] leading-relaxed text-white placeholder:text-white/25 focus:outline-none"
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
            />
          </div>
          {note && <p className="text-[12px] text-white/60">{note}</p>}
        </div>

        {/* Footer */}
        <div className="border-t p-5" style={{ borderColor: 'var(--a-border)' }}>
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${pMeta.color}, ${pMeta.color}cc)` }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{messagable && isConnected ? 'send' : 'open_in_new'}</span>
            {sending ? 'Sending…' : messagable && isConnected ? `Send DM on ${pMeta.label}` : `Open ${pMeta.label} & copy`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LeadRow ───────────────────────────────────────────────────────────────────

function LeadRow({
  lead, theme, isLast, hasPulse, connected, outreach, onReply, isSelected, onToggleSelect, onOpenDrawer, tags,
}: {
  lead: Lead;
  theme: ReturnType<typeof useWorkspaceTheme>;
  isLast: boolean;
  hasPulse: boolean;
  connected: Set<string>;
  outreach?: OutreachRec;
  onReply: (lead: Lead) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenDrawer: () => void;
  tags: { id: string; name: string; color: string }[];
}) {
  const intentMeta = INTENT_META[lead.intent_level] ?? { label: 'N/A', color: 'var(--t-fg-30)', dimBg: 'var(--t-fg-05)' };
  const action     = getAction(lead);
  const actionMeta = ACTION_META[action];
  const { label: originLabel, tone: originTone } = sourceLabel(lead.lead_source);

  const initials = lead.first_name?.slice(0, 2).toUpperCase() || 'LD';

  // Outreach: the lead's platform, whether it's connected (best channel), status.
  const platform = (lead.source || '').toLowerCase();
  const pMeta = PLATFORM_META[platform];
  const isConnected = connected.has(platform);
  const canReply = hasPulse && !!(lead.username || lead.profile_url || lead.post_url);
  const status = outreach?.status ?? 'not_contacted';

  return (
    <div
      className="group"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--a-border)',
        boxShadow: `inset 4px 0 0 ${intentMeta.color}`,
      }}
    >
      {/* Mobile (stacked) */}
      <div className={`flex flex-col gap-3 p-4 lg:hidden ${isSelected ? 'bg-[#6D5EF9]/[0.06]' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <label className="flex cursor-pointer items-center justify-center mr-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="h-4 w-4 cursor-pointer rounded border-white/20 bg-transparent accent-[#6D5EF9]"
              />
            </label>
            <Avatar initials={initials} theme={theme} />
            <div>
              <p className="text-[14px] font-semibold text-white">{lead.first_name || 'Unnamed'}</p>
              <p className="text-xs text-white/50">{lead.email || (lead.username ? `@${lead.username}` : '')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canReply && <ReplyButton lead={lead} pMeta={pMeta} isConnected={isConnected} status={status} onReply={onReply} />}
            <ActionPill action={action} meta={actionMeta} theme={theme} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <IntentPill meta={intentMeta} theme={theme} />
          <ToneBadge tone={originTone} theme={theme}>{originLabel}</ToneBadge>
          <ToneBadge tone="accent" theme={theme}>{toolLabel(lead.source_tool)}</ToneBadge>
          {lead.pipeline_stage && (
            <Link href="/admin/pipeline">
              <ToneBadge tone={STAGE_TONE[lead.pipeline_stage].tone} theme={theme} title="View in Pipeline">
                {STAGE_TONE[lead.pipeline_stage].label}
              </ToneBadge>
            </Link>
          )}
        </div>
        <div className="flex gap-4">
          <MiniField label="Window" value={lead.timeline_to_start || 'Not set'} theme={theme} />
          <MiniField label="Value"  value={lead.income_goal      || 'Unscored'} theme={theme} />
        </div>
        <div className="flex gap-2">
          <StatusDot active={!!lead.ghl_contact_id} label={lead.ghl_contact_id ? 'CRM synced' : 'CRM pending'} activeColor="#34d399" theme={theme} />
          <StatusDot active={lead.consented}         label={lead.consented ? 'Consent' : 'No consent'}      activeColor={theme.accent} theme={theme} />
        </div>
      </div>

      {/* Desktop (columns — matches header) */}
      <div
        className={`hidden lg:grid items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02] ${isSelected ? 'bg-[#6D5EF9]/[0.06]' : ''}`}
        style={{ gridTemplateColumns: '32px 140px minmax(0,1fr) 120px 110px 130px' }}
      >
        {/* Checkbox */}
        <label className="flex cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-transparent accent-[#6D5EF9]"
          />
        </label>

        {/* Contact */}
        <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={onOpenDrawer}>
          <Avatar initials={initials} theme={theme} small />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white leading-tight hover:underline">
              {lead.first_name || 'Unnamed'}
            </p>
            <p className="truncate text-[11px] text-white/40">{lead.email}</p>
          </div>
        </div>

        {/* Source + badges */}
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <IntentPill meta={intentMeta} theme={theme} />
            <ToneBadge tone={originTone} theme={theme}>{originLabel}</ToneBadge>
            {lead.pipeline_stage && (
              <Link href="/admin/pipeline">
                <ToneBadge tone={STAGE_TONE[lead.pipeline_stage].tone} theme={theme} title="View in Pipeline">
                  {STAGE_TONE[lead.pipeline_stage].label}
                </ToneBadge>
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ToneBadge tone="accent" theme={theme}>{toolLabel(lead.source_tool)}</ToneBadge>
            <StatusDot active={!!lead.ghl_contact_id} label={lead.ghl_contact_id ? 'CRM' : 'No CRM'} activeColor="#34d399" theme={theme} />
            <StatusDot active={lead.consented}         label={lead.consented ? 'Consent' : 'No consent'} activeColor={theme.accent} theme={theme} />
            {tags.slice(0, 2).map((tag) => (
              <span key={tag.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: tag.color + '20', color: tag.color }}>
                {tag.name}
              </span>
            ))}
            {tags.length > 2 && <span className="text-[10px] text-white/40">+{tags.length - 2}</span>}
          </div>
        </div>

        {/* Buying window */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: theme.fontMono }}>Window</p>
          <p className="text-sm font-medium text-white truncate">{lead.timeline_to_start || <span className="text-white/30 italic">Not set</span>}</p>
        </div>

        {/* Pipeline value */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: theme.fontMono }}>Value</p>
          <p className="text-sm font-medium text-white truncate">{lead.income_goal || <span className="text-white/30 italic">Unscored</span>}</p>
        </div>

        {/* Action */}
        <div className="flex items-center justify-end gap-2">
          {canReply && <ReplyButton lead={lead} pMeta={pMeta} isConnected={isConnected} status={status} onReply={onReply} />}
          <ActionPill action={action} meta={actionMeta} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ── ReplyButton ───────────────────────────────────────────────────────────────

function ReplyButton({
  lead, pMeta, isConnected, status, onReply,
}: {
  lead: Lead;
  pMeta?: { label: string; color: string };
  isConnected: boolean;
  status: OutreachStatus;
  onReply: (lead: Lead) => void;
}) {
  const color = pMeta?.color ?? '#6D5EF9';
  const done = status === 'sent' || status === 'replied';
  return (
    <button
      onClick={() => onReply(lead)}
      title={pMeta ? `Reply on ${pMeta.label}${isConnected ? ' (connected)' : ''}` : 'Reply'}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all hover:brightness-110"
      style={{
        background: done ? 'var(--t-fg-05)' : `${color}1f`,
        color: done ? 'var(--t-fg-50)' : color,
        border: `1px solid ${done ? 'var(--a-border)' : color + '55'}`,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{done ? 'check_circle' : 'send'}</span>
      {done ? (status === 'replied' ? 'Replied' : 'Sent') : 'Reply'}
      {isConnected && !done && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} title="Best channel — connected" />}
    </button>
  );
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Avatar({ initials, theme, small }: { initials: string; theme: ReturnType<typeof useWorkspaceTheme>; small?: boolean }) {
  const size = small ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <span
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-lg font-black`}
      style={{ background: theme.accentSoft, color: theme.accent }}
    >
      {initials}
    </span>
  );
}

function IntentPill({ meta, theme }: {
  meta: { label: string; color: string; dimBg: string };
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: meta.dimBg, color: meta.color, fontFamily: theme.fontMono }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function ActionPill({
  action, meta, theme,
}: {
  action: string;
  meta: { label: string; color: string; bg: string };
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={{ background: meta.bg, color: meta.color, fontFamily: theme.fontMono }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function StatusDot({ active, label, activeColor, theme }: {
  active: boolean;
  label: string;
  activeColor: string;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: active ? `${activeColor}15` : 'var(--t-fg-05)',
        color: active ? activeColor : 'var(--t-fg-30)',
      }}
    >
      <span
        className="h-1 w-1 rounded-full shrink-0"
        style={{ background: active ? activeColor : 'var(--t-fg-20)' }}
      />
      {label}
    </span>
  );
}

function ToneBadge({ children, tone, theme, title }: {
  children: React.ReactNode;
  tone: 'accent' | 'green' | 'gold' | 'blue' | 'red';
  theme: ReturnType<typeof useWorkspaceTheme>;
  title?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    accent: { bg: theme.accentSoft, fg: theme.accent },
    green:  { bg: 'rgba(16,185,129,0.12)',  fg: '#34d399' },
    gold:   { bg: 'rgba(212,163,115,0.12)', fg: '#d4a373' },
    blue:   { bg: 'rgba(99,102,241,0.12)',  fg: '#a5b4fc' },
    red:    { bg: 'rgba(239,68,68,0.12)',   fg: '#f87171' },
  };
  const { bg, fg } = map[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize"
      style={{ background: bg, color: fg, borderRadius: 'var(--t-radius-sm)', fontFamily: theme.fontMono }}
    >
      {children}
    </span>
  );
}

function MiniField({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useWorkspaceTheme> }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/30" style={{ fontFamily: theme.fontMono }}>{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white/80">{value}</p>
    </div>
  );
}

function PagBtn({ children, onClick, disabled, theme }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-25 hover:bg-white/5"
      style={{
        fontFamily: theme.fontMono,
        border: '1px solid var(--a-border)',
        color: 'var(--t-fg-45)',
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {children}
    </button>
  );
}
