'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { adminApi, pipelineApi } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';
import { getSubscription } from '@/lib/subscription-store';
import { tierInfo, leadTier } from '@/lib/labels';
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
  /** Direct link to the exact comment/post that triggered this lead. */
  url?: string | null;
  post_content?: string | null;
  summary?: string | null;
  // Sales-pipeline stage (from lead_pipeline, merged in by /api/crawler/leads).
  pipeline_stage?: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | null;
  pipeline_follow_up_at?: string | null;
  // Hot Lead Score (buying-intent) — from the scoring engine; null on older rows.
  hot_lead_score?: number | null;
  lead_tier?: string | null;
  detected_intent?: string | null;
  score_reason?: string | null;
  recommended_response_time?: string | null;
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
    case 'crawler':  return { label: 'Found by SYNQ', tone: 'gold' };
    case 'so':
    case 'social':   return { label: 'Social media',  tone: 'blue' };
    case 'import':   return { label: 'Imported',      tone: 'blue' };
    default:         return { label: 'Your website',  tone: 'green' };
  }
}

const LEAD_SOURCES   = ['google-ads', 'meta-ads', 'instagram-ads', 'linkedin-ads', 'crm-import'];
const INTENT_LEVELS  = ['', 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'];

const INTENT_META: Record<string, { label: string; color: string; dimBg: string }> = {
  HIGH_INTENT:   { label: 'Hot',  color: '#EB4203', dimBg: 'rgba(235,66,3,0.10)'   },
  MEDIUM_INTENT: { label: 'Warm', color: '#FF9C5F', dimBg: 'rgba(255,156,95,0.10)' },
  LOW_INTENT:    { label: 'Cool', color: '#00CEC8', dimBg: 'rgba(0,206,200,0.10)'  },
};

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  'Route now':       { label: 'Send to CRM',      color: '#EB4203', bg: 'rgba(235,66,3,0.12)'    },
  'Consent needed':  { label: 'Needs permission', color: '#f87171', bg: 'rgba(239,68,68,0.12)'   },
  'Sync pending':    { label: 'Not sent yet',     color: '#FF9C5F', bg: 'rgba(255,156,95,0.12)'  },
  'In workflow':     { label: 'Sent to CRM',      color: '#34d399', bg: 'rgba(16,185,129,0.12)'  },
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

/** Buying-intent badge: tier label + Hot Lead Score, from the scoring engine.
 *  Falls back to the coarse intent level for leads classified before scoring. */
function HotScoreBadge({ lead }: { lead: Lead }) {
  const tier = leadTier({ tier: lead.lead_tier, hotScore: lead.hot_lead_score, intentLevel: lead.intent_level });
  const { label, tone } = tierInfo(tier);
  const color = tone === 'hot' ? '#EB4203' : tone === 'warm' ? '#FF9C5F' : tone === 'cool' ? '#00CEC8' : 'var(--t-fg-40)';
  const score = typeof lead.hot_lead_score === 'number' ? lead.hot_lead_score : null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
      title={lead.score_reason || undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}{score !== null ? ` · ${score}` : ''}
    </span>
  );
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

  // Bulk selection + actions.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy,     setBulkBusy]   = useState(false);
  const [bulkTagId,    setBulkTagId]  = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [teamMembers,  setTeamMembers]  = useState<{ id: string; name: string; email: string; is_active?: boolean }[]>([]);

  // Duplicate detection.
  const [duplicates,     setDuplicates]     = useState<{ key: string; type: string; leads: { id: string; name: string | null; email: string | null; username: string | null; source: string; created_at: string }[] }[]>([]);
  const [dupTotal,       setDupTotal]       = useState(0);
  const [showDupModal,   setShowDupModal]   = useState(false);
  const [dupBannerDismissed, setDupBannerDismissed] = useState(false);
  const [mergingKey,     setMergingKey]     = useState<string | null>(null);

  // CSV import.
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile,      setImportFile]      = useState<File | null>(null);
  const [importBusy,      setImportBusy]      = useState(false);
  const [importResult,    setImportResult]    = useState<string | null>(null);

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

  // Load team members for the "Assign to" bulk action.
  useEffect(() => {
    adminApi.getUsers().then((r) => setTeamMembers((r.data.users ?? []).filter((u: { is_active?: boolean }) => u.is_active !== false))).catch(() => {});
  }, []);

  // Load tags for current leads.
  const reloadLeadTags = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (!token || leads.length === 0) return Promise.resolve();
    const leadIds = leads.map((l) => l.id);
    return fetch(`/api/leads/tags/batch?leadIds=${encodeURIComponent(leadIds.join(','))}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setLeadTags(d.tags ?? {}))
      .catch(() => {});
  }, [leads]);
  useEffect(() => { reloadLeadTags(); }, [reloadLeadTags]);

  // Duplicate detection.
  const loadDuplicates = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    if (!token) return;
    fetch('/api/leads/duplicates', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setDuplicates(d.duplicates ?? []); setDupTotal(d.total ?? 0); } })
      .catch(() => {});
  }, []);
  useEffect(() => { loadDuplicates(); }, [loadDuplicates]);

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
    { label: 'All leads',       value: leads.length,     color: theme.accent  },
    { label: 'Hot leads',       value: highIntentCount,  color: '#EB4203'    },
    { label: 'Sent to CRM',     value: syncedCount,      color: '#10b981'    },
    { label: 'Gave permission', value: `${consentPct}%`, color: '#FF9C5F'  },
  ];

  // Which social platforms appear among these leads, and are any unconnected?
  const leadPlatforms = Array.from(new Set(leads.map((l) => (l.source || '').toLowerCase()).filter((p) => PLATFORM_META[p])));
  const unconnectedPlatforms = leadPlatforms.filter((p) => !connected.has(p) && p !== 'linkedin');
  const showConnectBanner = hasPulse && leads.length > 0 && unconnectedPlatforms.length > 0;

  const openReply = (lead: Lead) => setReplyLead(lead);
  const onSent = (leadId: string, status: OutreachStatus, platform: string) => {
    setOutreach((prev) => ({ ...prev, [leadId]: { status, platform } }));
  };

  const visibleLeads = useMemo(() => leads.filter((l) => {
    if (filters.outreach && (outreach[l.id]?.status ?? 'not_contacted') !== filters.outreach) return false;
    if (tagFilter && !(leadTags[l.id] ?? []).some((t) => t.id === tagFilter)) return false;
    return true;
  }), [leads, filters.outreach, tagFilter, outreach, leadTags]);

  const authHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    return { Authorization: `Bearer ${token}` };
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (visibleLeads.every((l) => prev.has(l.id)) && visibleLeads.length > 0) return new Set();
      return new Set(visibleLeads.map((l) => l.id));
    });
  };

  const applyBulkTag = async (tagId: string) => {
    if (!tagId || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await fetch('/api/leads/tags/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), tagId }),
      });
      setBulkTagId('');
      setSelectedIds(new Set());
      await reloadLeadTags();
    } finally {
      setBulkBusy(false);
    }
  };

  const applyBulkStage = async (stage: 'new' | 'contacted' | 'qualified') => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => pipelineApi.update(id, { stage })));
      setSelectedIds(new Set());
      await fetchLeads();
    } finally {
      setBulkBusy(false);
    }
  };

  const applyBulkAssign = async (userId: string) => {
    if (!userId || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await fetch('/api/leads/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ leadIds: Array.from(selectedIds), userId }),
      });
      setBulkAssignee('');
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  };

  const mergeGroup = async (groupKey: string, primaryId: string, mergeIds: string[]) => {
    setMergingKey(groupKey);
    try {
      await fetch('/api/leads/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ primaryId, mergeIds }),
      });
      await Promise.all([fetchLeads(), loadDuplicates()]);
    } finally {
      setMergingKey(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
      const r = await fetch('/api/leads/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await r.json();
      setImportResult(d.message || (r.ok ? 'Import complete.' : 'Import failed.'));
      if (r.ok) { setImportFile(null); await fetchLeads(); }
    } catch {
      setImportResult('Network error.');
    } finally {
      setImportBusy(false);
    }
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
              <p className="text-[15px] font-bold text-white">Message these leads directly</p>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/60">
                Add <span className="font-semibold text-white/85">Messages</span> and you can reply to every lead here on the
                app they came from — Instagram, LinkedIn, X and more — with an AI-written opener, right from this page.
              </p>
            </div>
          </div>
          <Link
            href="/admin/subscription"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(109,94,249,0.4)] transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #6D5EF9, #5B4FE8)' }}
          >
            Get Messages
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
                Connect {unconnectedPlatforms.length > 1 ? 'these accounts' : 'this account'} under Messages to reply to them directly.
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
              Your leads
            </p>
            <h1 className="text-[26px] font-black leading-tight tracking-tight text-white">
              People you can contact
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              Everyone we’ve found who’s interested in what you do. Start with your hot leads.
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
            {' '}
            <span className="font-semibold text-white">
              {unsyncedCount ? `${unsyncedCount} leads not sent to your CRM yet` : 'All leads here are sent to your CRM'}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:text-white"
              style={{ borderColor: 'var(--a-border)' }}
            >
              <span className="material-symbols-outlined text-[15px]">upload</span>
              Import CSV
            </button>
            <a
              href="/api/leads/export"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:text-white"
              style={{ borderColor: 'var(--a-border)' }}
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              Export CSV
            </a>
          </div>
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
                Sending…
              </>
            ) : syncState === 'done' ? (
              <>✓ Sending {syncResult?.queued ?? 0}</>
            ) : syncState === 'error' ? (
              <>Didn’t work · try again</>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
                </svg>
                Send to CRM
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

      {/* ── Duplicate banner ── */}
      {!dupBannerDismissed && dupTotal > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3.5"
          style={{ background: 'rgba(255,181,71,0.08)', borderColor: 'rgba(255,181,71,0.30)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined" style={{ color: '#FFB547' }}>content_copy</span>
            <p className="text-[13px] text-white/80">
              <span className="font-bold text-white">{dupTotal} potential duplicate{dupTotal === 1 ? '' : 's'}</span> found (same email or username).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDupModal(true)} className="text-[12px] font-semibold underline" style={{ color: '#FFB547' }}>
              Review duplicates →
            </button>
            <button onClick={() => setDupBannerDismissed(true)} className="text-white/30 hover:text-white/60">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-3"
          style={{ background: 'var(--t-accent-soft)', borderColor: theme.accent + '50' }}
        >
          <span className="text-[13px] font-bold text-white">{selectedIds.size} selected</span>
          <span className="h-4 w-px" style={{ background: 'var(--a-border)' }} />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/50">Move to:</span>
            {(['new', 'contacted', 'qualified'] as const).map((s) => (
              <button
                key={s}
                disabled={bulkBusy}
                onClick={() => applyBulkStage(s)}
                className="rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors hover:brightness-110 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--a-border)', color: 'white' }}
              >
                → {s}
              </button>
            ))}
          </div>
          <span className="h-4 w-px" style={{ background: 'var(--a-border)' }} />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/50">Tag:</span>
            <select
              value={bulkTagId}
              disabled={bulkBusy}
              onChange={(e) => applyBulkTag(e.target.value)}
              className="rounded-lg bg-white/5 px-2 py-1 text-[12px] text-white outline-none"
            >
              <option value="" className="bg-[#112126]">Choose a tag…</option>
              {allTags.map((t) => <option key={t.id} value={t.id} className="bg-[#112126]">{t.name}</option>)}
            </select>
          </div>
          <span className="h-4 w-px" style={{ background: 'var(--a-border)' }} />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/50">Assign to:</span>
            <select
              value={bulkAssignee}
              disabled={bulkBusy}
              onChange={(e) => applyBulkAssign(e.target.value)}
              className="rounded-lg bg-white/5 px-2 py-1 text-[12px] text-white outline-none"
            >
              <option value="" className="bg-[#112126]">Choose a person…</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id} className="bg-[#112126]">{m.name || m.email}</option>)}
            </select>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-[11px] text-white/40 hover:text-white/70">
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
              gridTemplateColumns: '22px 140px minmax(0,1fr) 120px 110px 130px',
              borderBottom: '1px solid var(--a-border)',
              background: 'var(--t-fg-03)',
              fontFamily: theme.fontMono,
            }}
          >
            <input
              type="checkbox"
              checked={visibleLeads.length > 0 && visibleLeads.every((l) => selectedIds.has(l.id))}
              onChange={toggleSelectAllVisible}
              className="h-3.5 w-3.5 cursor-pointer"
            />
            <span>Contact</span>
            <span>Where from</span>
            <span>When</span>
            <span>Their goal</span>
            <span>What to do</span>
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
          ) : visibleLeads.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-white/30">No leads match these filters</div>
          ) : (
            visibleLeads.map((lead, i) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                theme={theme}
                isLast={i === visibleLeads.length - 1}
                hasPulse={hasPulse}
                connected={connected}
                outreach={outreach[lead.id]}
                onReply={openReply}
                onOpenDrawer={() => setDrawerLead(lead)}
                tags={leadTags[lead.id] ?? []}
                selected={selectedIds.has(lead.id)}
                onToggleSelect={() => toggleSelect(lead.id)}
              />
            ))
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
              Where leads come from
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
              What to do next
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
              A quick tip
            </p>
            <p className="text-[15px] font-black leading-snug tracking-tight text-white">
              Reach out to your hot leads first.
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-white/60">
              They’re the most ready to buy. Warm and cool leads are worth a gentle follow-up over time.
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

      {/* ── Duplicate review modal ── */}
      {showDupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(3,8,15,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowDupModal(false); }}>
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6" style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-white">Potential duplicates ({dupTotal})</h2>
              <button onClick={() => setShowDupModal(false)} className="text-white/40 hover:text-white/80"><span className="material-symbols-outlined">close</span></button>
            </div>
            {duplicates.length === 0 ? (
              <p className="text-sm text-white/50">No duplicates found.</p>
            ) : (
              <div className="space-y-4">
                {duplicates.map((group) => (
                  <div key={group.key} className="rounded-xl p-3.5" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.type} · {group.key}</p>
                    <div className="space-y-1.5">
                      {group.leads.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-[13px] text-white/80">
                          <span>{l.name || l.username || l.email || l.id} <span className="text-white/30">· {l.source}</span></span>
                        </div>
                      ))}
                    </div>
                    <button
                      disabled={mergingKey === group.key}
                      onClick={() => {
                        const [primary, ...rest] = group.leads;
                        mergeGroup(group.key, primary.id, rest.map((r) => r.id));
                      }}
                      className="mt-3 rounded-full px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                      style={{ background: theme.accent }}
                    >
                      {mergingKey === group.key ? 'Merging…' : `Merge into "${group.leads[0]?.name || group.leads[0]?.username || 'first'}"`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CSV import modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(3,8,15,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--a-bg)', border: '1px solid var(--a-border)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-white">Import leads from CSV</h2>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }} className="text-white/40 hover:text-white/80"><span className="material-symbols-outlined">close</span></button>
            </div>
            <p className="mb-3 text-[12px] leading-relaxed text-white/50">
              Columns recognized: name, email, phone, company, source, notes. Leads with an email already imported are skipped.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="w-full text-[12px] text-white/70"
            />
            {importResult && <p className="mt-3 text-[12px] text-white/70">{importResult}</p>}
            <button
              onClick={handleImportSubmit}
              disabled={!importFile || importBusy}
              className="mt-4 w-full rounded-full py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
              style={{ background: theme.accent }}
            >
              {importBusy ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      )}
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
        // Copy the draft, then open a direct message with this lead on their
        // platform (falls back to their profile where there's no web DM link).
        try { await navigator.clipboard.writeText(text.trim()); } catch { /* ignore */ }
        const opened = d.dmUrl || d.url;
        if (opened) window.open(opened, '_blank', 'noopener');
        setNote(
          d.isTrueDm
            ? `Message copied — opened your chat with them on ${pMeta.label}. Just paste and send.`
            : `Message copied — opened ${pMeta.label}. Tap Message, paste and send.`,
        );
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
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">What they said</p>
                {(lead.url || lead.post_url) && (
                  <a href={lead.url || lead.post_url || undefined} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline" style={{ color: pMeta.color }}>
                    Open original
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                )}
              </div>
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
              Connect your {pMeta.label} account under <Link href="/admin/comms" className="underline" style={{ color: pMeta.color }}>Messages</Link> to send this as a direct message. Until then, we’ll help you send it yourself.
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
  lead, theme, isLast, hasPulse, connected, outreach, onReply, onOpenDrawer, tags, selected, onToggleSelect,
}: {
  lead: Lead;
  theme: ReturnType<typeof useWorkspaceTheme>;
  isLast: boolean;
  hasPulse: boolean;
  connected: Set<string>;
  outreach?: OutreachRec;
  onReply: (lead: Lead) => void;
  onOpenDrawer: () => void;
  tags: { id: string; name: string; color: string }[];
  selected: boolean;
  onToggleSelect: () => void;
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
      <div className="flex flex-col gap-3 p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer"
            />
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
          <HotScoreBadge lead={lead} />
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
        {lead.recommended_response_time && (leadTier({ tier: lead.lead_tier, hotScore: lead.hot_lead_score, intentLevel: lead.intent_level }) === 'immediate' || leadTier({ tier: lead.lead_tier, hotScore: lead.hot_lead_score, intentLevel: lead.intent_level }) === 'hot') && (
          <p className="text-[11px] font-semibold" style={{ color: '#EB4203' }}>Respond {lead.recommended_response_time.toLowerCase()}</p>
        )}
        <div className="flex gap-4">
          <MiniField label="When" value={lead.timeline_to_start || 'Not set'} theme={theme} />
          <MiniField label="Their goal" value={lead.income_goal || 'Not set'} theme={theme} />
        </div>
        <div className="flex gap-2">
          <StatusDot active={!!lead.ghl_contact_id} label={lead.ghl_contact_id ? 'Sent to CRM' : 'Not sent'} activeColor="#34d399" theme={theme} />
          <StatusDot active={lead.consented}         label={lead.consented ? 'Has permission' : 'No permission'} activeColor={theme.accent} theme={theme} />
        </div>
      </div>

      {/* Desktop (columns — matches header) */}
      <div
        className="hidden lg:grid items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
        style={{ gridTemplateColumns: '22px 140px minmax(0,1fr) 120px 110px 130px' }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 cursor-pointer"
        />
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
            <HotScoreBadge lead={lead} />
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
            <StatusDot active={!!lead.ghl_contact_id} label={lead.ghl_contact_id ? 'Sent' : 'Not sent'} activeColor="#34d399" theme={theme} />
            <StatusDot active={lead.consented}         label={lead.consented ? 'Has permission' : 'No permission'} activeColor={theme.accent} theme={theme} />
            {tags.slice(0, 2).map((tag) => (
              <span key={tag.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: tag.color + '20', color: tag.color }}>
                {tag.name}
              </span>
            ))}
            {tags.length > 2 && <span className="text-[10px] text-white/40">+{tags.length - 2}</span>}
          </div>
        </div>

        {/* When they want to start */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: theme.fontMono }}>When</p>
          <p className="text-sm font-medium text-white truncate">{lead.timeline_to_start || <span className="text-white/30 italic">Not set</span>}</p>
        </div>

        {/* Their goal */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: theme.fontMono }}>Their goal</p>
          <p className="text-sm font-medium text-white truncate">{lead.income_goal || <span className="text-white/30 italic">Not set</span>}</p>
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
