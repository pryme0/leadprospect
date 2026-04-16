'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';

interface OutreachMessage {
  id: string;
  signal_id: string;
  platform: string;
  username: string;
  name?: string | null;
  original_content: string;
  original_url: string;
  tool_recommendation: string;
  suggested_reply: string;
  outreach_type: string; // reply | dm
  status: string; // pending | approved | sent | skipped | failed
  auto_approved: boolean;
  send_error: string | null;
  sent_url: string | null;
  intent_level: string;
  urgency_score: number;
  intent_category: string;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
}

interface Stats {
  sent_today: number;
  approved_today: number;
  pending_total: number;
  approved_total: number;
  total_sent: number;
  failed_total: number;
  failed_today: number;
  skipped_total: number;
  daily_target: number;
  sent_by_day: { date: string; count: number }[];
  sent_by_platform: { platform: string; count: number }[];
  sent_by_tool: { tool: string; count: number }[];
  approved_by_tool: { tool: string; count: number }[];
  failed_by_platform: { platform: string; count: number }[];
  top_failure_reasons: { reason: string; count: number }[];
}

const PLATFORM_ICONS: Record<string, string> = {
  twitter: 'X',
  reddit: 'R',
  youtube: 'YT',
  linkedin: 'in',
  instagram: 'IG',
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  reddit: '#FF4500',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  instagram: '#E1306C',
};

const TOOL_LABELS: Record<string, string> = {
  'cyber-path-finder': 'Career Path',
  'career-assessment': 'Assessment',
  'resume-analyzer': 'Resume',
};

const INTENT_COLORS: Record<string, string> = {
  HIGH_INTENT: '#0BAAEF',
  MEDIUM_INTENT: '#40C4FF',
  LOW_INTENT: '#94a3b8',
};

/**
 * Convert raw API error JSON into a human-readable title + actionable hint.
 * Never shows raw JSON on screen.
 */
function friendlyError(raw: string): { title: string; hint: string } {
  const text = raw || '';

  if (text.includes('CreditsDepleted')) {
    return {
      title: 'Twitter free tier monthly quota exhausted',
      hint: 'Upgrade to Twitter API Basic ($200/mo) or wait for the quota to reset.',
    };
  }
  if (text.includes('oauth1 app permission') || text.includes('not configured with the appropriate')) {
    return {
      title: 'Twitter app is read-only',
      hint: 'Enable "Read + Write + DM" in the Twitter developer portal and regenerate access tokens.',
    };
  }
  if (text.includes('"status":401') || text.includes('Unauthorized')) {
    return {
      title: 'Twitter authentication failed',
      hint: 'Access tokens may be expired or have wrong scope. Regenerate in the developer portal.',
    };
  }
  if (text.includes('"status":403') || text.includes('Forbidden')) {
    return {
      title: 'Twitter rejected the request (403)',
      hint: 'Check app permissions and verify the account is not suspended.',
    };
  }
  if (text.includes('li_at') || text.includes('csrf-token') || text.includes('voyager')) {
    return {
      title: 'LinkedIn session cookie expired',
      hint: 'Log in fresh to LinkedIn and update LINKEDIN_SESSION_COOKIE in .env.',
    };
  }
  if (text.includes('RATELIMIT') || text.includes('TOO_FAST')) {
    return {
      title: 'Reddit rate limit hit',
      hint: 'Too many requests — Reddit will release the limit shortly.',
    };
  }
  if (text.includes('reddit') && text.includes('401')) {
    return {
      title: 'Reddit authentication failed',
      hint: 'Check REDDIT_USERNAME, PASSWORD, CLIENT_ID, CLIENT_SECRET in .env.',
    };
  }
  if (text.includes('quotaExceeded') || (text.includes('youtube') && text.includes('403'))) {
    return {
      title: 'YouTube daily API quota exceeded',
      hint: 'Resets at midnight Pacific Time. Reduce YOUTUBE_DAILY_QUOTA in .env.',
    };
  }
  if (text.includes('402')) {
    return {
      title: 'Payment required — plan upgrade needed',
      hint: 'The platform API tier is exhausted. Upgrade or wait for the quota to reset.',
    };
  }
  if (text.includes('ETIMEDOUT') || text.includes('ECONNREFUSED') || text.includes('socket hang up')) {
    return {
      title: 'Network error reaching platform',
      hint: 'Transient issue — will retry on next cron cycle.',
    };
  }
  return {
    title: 'Platform API error',
    hint: 'Check the failed outreach tab to see the affected message and error details.',
  };
}

export default function OutreachPage() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [platformFilter, setPlatformFilter] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  // viewMode toggles between the standard outreach queue and the
  // "manual DM required" queue (rows the agent flagged DM-disabled)
  const [viewMode, setViewMode] = useState<'queue' | 'manual_dm'>('queue');
  const [manualDmTotal, setManualDmTotal] = useState<number>(0);
  const [manualDmByPlatform, setManualDmByPlatform] = useState<{ platform: string; count: number }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [queueTotal, setQueueTotal] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'manual_dm') {
        const [mdmRes, statsRes] = await Promise.all([
          adminApi.getManualDmRequired({
            page,
            limit: 15,
            platform: platformFilter || undefined,
          }),
          adminApi.getOutreachStats(),
        ]);
        setMessages(mdmRes.data.data);
        setTotalPages(mdmRes.data.pagination.total_pages);
        setManualDmTotal(mdmRes.data.pagination.total);
        setManualDmByPlatform(mdmRes.data.by_platform || []);
        setStats(statsRes.data);
      } else {
        const [queueRes, statsRes, mdmCountRes] = await Promise.all([
          adminApi.getOutreachQueue({
            page,
            limit: 15,
            status: statusFilter || undefined,
            platform: platformFilter || undefined,
            tool_recommendation: toolFilter || undefined,
          }),
          adminApi.getOutreachStats(),
          // Always fetch the manual-dm count even on the queue tab so the
          // badge stays in sync without a second click
          adminApi.getManualDmRequired({ page: 1, limit: 1 }),
        ]);
        setMessages(queueRes.data.data);
        setTotalPages(queueRes.data.pagination.total_pages);
        setQueueTotal(queueRes.data.pagination.total);
        setStats(statsRes.data);
        setManualDmTotal(mdmCountRes.data.pagination.total);
        setManualDmByPlatform(mdmCountRes.data.by_platform || []);
      }
    } catch (err) {
      console.error('Failed to load outreach data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, platformFilter, toolFilter, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await adminApi.triggerOutreachGenerate();
      await loadData();
    } catch (err) {
      console.error('Generate failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAction = async (id: string, status: 'approved' | 'sent' | 'skipped', reply?: string) => {
    try {
      await adminApi.updateOutreach(id, { status, reply });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status, suggested_reply: reply || m.suggested_reply } : m)),
      );
      setEditingId(null);
      // Refresh stats
      const statsRes = await adminApi.getOutreachStats();
      setStats(statsRes.data);
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const progressPercent = stats ? Math.min(100, Math.round((stats.sent_today / stats.daily_target) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Sent Today', value: stats?.sent_today ?? 0, target: `/ ${stats?.daily_target ?? 2000}`, color: '#0BAAEF' },
          { label: 'Approved (Ready)', value: stats?.approved_total ?? 0, color: '#40C4FF' },
          { label: 'Pending Review', value: stats?.pending_total ?? 0, color: '#f59e0b' },
          { label: 'Total Sent', value: stats?.total_sent ?? 0, color: '#10b981' },
          {
            label: 'Failed',
            value: stats?.failed_total ?? 0,
            sub: stats?.failed_today ? `${stats.failed_today} today` : undefined,
            color: '#ef4444',
          },
        ].map((s: any, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--a-muted)' }}>{s.label}</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
              {s.target && <span className="text-xs" style={{ color: 'var(--a-muted)' }}>{s.target}</span>}
            </div>
            {s.sub && <p className="text-[10px] mt-1" style={{ color: 'var(--a-muted)' }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Classification breakdown — approved outreach by tool recommendation */}
      {(stats?.approved_by_tool ?? []).length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--a-text)' }}>
                Classification — Approved by Tool
              </h3>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--a-muted)' }}>
              click a tool to filter the list below
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(stats?.approved_by_tool ?? []).map((t) => {
              const isActive = toolFilter === t.tool;
              return (
                <button
                  key={t.tool}
                  onClick={() => { setToolFilter(isActive ? '' : t.tool); setPage(1); }}
                  className="rounded-lg border p-3 text-left transition-all hover:border-cyan-500/50"
                  style={{
                    background: isActive ? 'rgba(11, 170, 239, 0.08)' : 'var(--a-hover)',
                    borderColor: isActive ? '#0BAAEF' : 'var(--a-border)',
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--a-muted)' }}>
                    {TOOL_LABELS[t.tool] || t.tool}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: isActive ? '#0BAAEF' : 'var(--a-text)' }}>
                    {t.count}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--a-muted)' }}>
                    leads ready for outreach
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily progress bar */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--a-text)' }}>Daily Progress</span>
          <span className="text-xs font-semibold" style={{ color: '#0BAAEF' }}>{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--a-hover)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #0BAAEF, #40C4FF)' }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--a-muted)' }}>
          {stats?.sent_today ?? 0} of {stats?.daily_target ?? 2000} messages sent today
        </p>
      </div>

      {/* View toggle: standard outreach queue vs Manual DM Required */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setViewMode('queue'); setPage(1); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={
            viewMode === 'queue'
              ? { background: '#0BAAEF', color: '#080e1c' }
              : { background: 'var(--a-card)', color: 'var(--a-muted)', border: '1px solid var(--a-border)' }
          }
        >
          Outreach Queue
        </button>
        <button
          onClick={() => { setViewMode('manual_dm'); setPage(1); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={
            viewMode === 'manual_dm'
              ? { background: '#f59e0b', color: '#000' }
              : { background: 'var(--a-card)', color: 'var(--a-muted)', border: '1px solid var(--a-border)' }
          }
        >
          Manual DM Required
          {manualDmTotal > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: viewMode === 'manual_dm' ? '#000' : '#f59e0b',
                color: viewMode === 'manual_dm' ? '#f59e0b' : '#000',
              }}
            >
              {manualDmTotal}
            </span>
          )}
        </button>
        {viewMode === 'manual_dm' && manualDmByPlatform.length > 0 && (
          <div className="ml-2 flex items-center gap-2 text-[10px]" style={{ color: 'var(--a-muted)' }}>
            <span>by platform:</span>
            {manualDmByPlatform.map((p) => (
              <span
                key={p.platform}
                className="px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--a-hover)', color: 'var(--a-text)' }}
              >
                {p.platform} {p.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {viewMode === 'queue' && (
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--a-hover)' }}>
            {['pending', 'approved', 'sent', 'failed', 'skipped', ''].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={statusFilter === s ? { background: 'var(--a-card)', color: '#0BAAEF' } : { color: 'var(--a-muted)' }}
              >
                {s || 'All'}
                {statusFilter === s && queueTotal > 0 && (
                  <span className="ml-1.5 opacity-70">({queueTotal})</span>
                )}
              </button>
            ))}
          </div>
        )}
        {viewMode === 'manual_dm' && (
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--a-hover)', color: 'var(--a-text)' }}>
            Showing leads where the agent detected DMs are disabled — click <strong>Open</strong> to DM them manually on the original platform.
          </div>
        )}

        <select
          className="text-xs rounded-lg border px-3 py-2"
          style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Platforms</option>
          <option value="twitter">Twitter/X</option>
          <option value="reddit">Reddit</option>
          <option value="youtube">YouTube</option>
          <option value="linkedin">LinkedIn</option>
          <option value="instagram">Instagram</option>
        </select>

        <select
          className="text-xs rounded-lg border px-3 py-2"
          style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
          value={toolFilter}
          onChange={(e) => { setToolFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Tools</option>
          <option value="cyber-path-finder">Cyber Path Finder</option>
          <option value="career-assessment">Career Assessment</option>
          <option value="resume-analyzer">Resume Analyzer</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={async () => { await adminApi.bulkApproveOutreach(); await loadData(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#f59e0b', color: '#000' }}
          >
            Approve All Pending
          </button>
          <button
            onClick={async () => { await adminApi.retryFailedOutreach(); await loadData(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all"
            style={{ borderColor: 'var(--a-border2)', color: 'var(--a-text)', background: 'var(--a-card)' }}
          >
            Retry Failed
          </button>
          <button
            onClick={async () => { await adminApi.triggerOutreachSend(); await loadData(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#10b981', color: '#fff' }}
          >
            Send Approved
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#0BAAEF', color: '#080e1c' }}
          >
            {generating ? (
              <><span className="loading-spinner w-3 h-3" /> Generating...</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Replies
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="loading-spinner w-8 h-8" style={{ borderColor: '#0BAAEF' }} />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--a-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="font-medium" style={{ color: 'var(--a-text)' }}>No messages in queue</p>
          <p className="text-sm mt-1" style={{ color: 'var(--a-muted)' }}>
            Click "Generate Replies" to create outreach messages from classified signals.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--a-border)' }}>
                {/* Platform badge */}
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: PLATFORM_COLORS[msg.platform] || '#666' }}
                >
                  {PLATFORM_ICONS[msg.platform] || '?'}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--a-text)' }}>
                      {msg.name || `@${msg.username}`}
                    </span>
                    {msg.name && msg.username && msg.username !== msg.name && !/^ACoAA/i.test(msg.username) && (
                      <span className="text-[10px] font-mono truncate max-w-[140px]" style={{ color: 'var(--a-muted)' }}>
                        @{msg.username}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${INTENT_COLORS[msg.intent_level] || '#666'}20`, color: INTENT_COLORS[msg.intent_level] || '#666' }}>
                      {msg.intent_level?.replace('_', ' ')}
                    </span>
                    {msg.urgency_score > 0 && (
                      <span className="text-[10px] font-medium" style={{ color: 'var(--a-muted)' }}>
                        Urgency: {msg.urgency_score}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] truncate" style={{ color: 'var(--a-muted)' }}>
                    {msg.platform} · {msg.intent_category} · {new Date(msg.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Tool badge */}
                <span className="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0"
                  style={{ background: 'rgba(11,170,239,0.1)', color: '#0BAAEF', border: '1px solid rgba(11,170,239,0.2)' }}>
                  {TOOL_LABELS[msg.tool_recommendation] || msg.tool_recommendation}
                </span>

                {/* Type badge (DM / Reply) */}
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 ${
                  msg.outreach_type === 'dm'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}>
                  {msg.outreach_type === 'dm' ? 'DM' : 'Reply'}
                </span>

                {/* Status badge */}
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 ${
                  msg.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                  msg.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                  msg.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' :
                  msg.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-white/5 text-white/40'
                }`}>
                  {msg.status}{msg.auto_approved ? ' (auto)' : ''}
                </span>
              </div>

              {/* Content */}
              <div className="px-4 py-3 space-y-3">
                {/* Original post */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--a-muted)' }}>
                    Original Post
                  </p>
                  <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--a-text)', opacity: 0.7 }}>
                    {msg.original_content}
                  </p>
                  {msg.original_url && (
                    <a href={msg.original_url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: '#0BAAEF' }}>
                      View original
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Suggested reply */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#0BAAEF' }}>
                    AI Suggested Reply
                  </p>
                  {editingId === msg.id ? (
                    <textarea
                      className="w-full text-xs rounded-lg border p-3 min-h-[80px] resize-y"
                      style={{ background: 'var(--a-hover)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--a-text)' }}>
                      {msg.suggested_reply}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--a-border)', background: 'var(--a-hover)' }}>
                {viewMode === 'manual_dm' && (
                  <>
                    <span className="text-[10px] px-2 py-1 rounded font-semibold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                      DM disabled — manual outreach
                    </span>
                    {msg.original_url && (
                      <a
                        href={msg.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: '#f59e0b', color: '#000' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open original post
                      </a>
                    )}
                    <button
                      onClick={() => copyToClipboard(msg.suggested_reply, msg.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'var(--a-card)', color: 'var(--a-text)', border: '1px solid var(--a-border2)' }}
                    >
                      {copied === msg.id ? '✓ Copied' : 'Copy reply text'}
                    </button>
                    {msg.outreach_type === 'dm' && (
                      <button
                        onClick={async () => {
                          await adminApi.convertDmToReply(msg.id);
                          await loadData();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(11,170,239,0.15)', color: '#0BAAEF' }}
                      >
                        Requeue as Reply
                      </button>
                    )}
                  </>
                )}
                {viewMode === 'queue' && msg.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction(msg.id, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(11,170,239,0.15)', color: '#0BAAEF' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => { setEditingId(msg.id); setEditText(msg.suggested_reply); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'var(--a-card)', color: 'var(--a-text)', border: '1px solid var(--a-border2)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleAction(msg.id, 'skipped')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ color: 'var(--a-muted)' }}
                    >
                      Skip
                    </button>
                  </>
                )}

                {editingId === msg.id && (
                  <>
                    <button
                      onClick={() => handleAction(msg.id, 'approved', editText)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: '#0BAAEF', color: '#080e1c' }}
                    >
                      Save & Approve
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--a-muted)' }}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {viewMode === 'queue' && msg.status === 'failed' && (
                  <>
                    {msg.send_error && (
                      <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={msg.send_error}>
                        Error: {msg.send_error}
                      </span>
                    )}
                    <button
                      onClick={() => handleAction(msg.id, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(11,170,239,0.15)', color: '#0BAAEF' }}
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => handleAction(msg.id, 'skipped')}
                      className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--a-muted)' }}
                    >
                      Skip
                    </button>
                  </>
                )}

                {viewMode === 'queue' && (msg.status === 'approved' || msg.status === 'sent') && (
                  <>
                    <button
                      onClick={() => copyToClipboard(msg.suggested_reply, msg.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(11,170,239,0.15)', color: '#0BAAEF' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copied === msg.id ? 'Copied!' : 'Copy Reply'}
                    </button>

                    {/* Show "View Sent Reply" when sent — links directly to the posted comment/DM */}
                    {msg.status === 'sent' && msg.sent_url && (
                      <a
                        href={msg.sent_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: '#10b981', color: '#fff' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View {msg.outreach_type === 'dm' ? 'DM' : 'Comment'}
                      </a>
                    )}

                    {msg.original_url && (
                      <a
                        href={msg.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'var(--a-card)', color: 'var(--a-text)', border: '1px solid var(--a-border2)' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Go to Post
                      </a>
                    )}
                    {msg.status === 'approved' && (
                      <button
                        onClick={() => handleAction(msg.id, 'sent')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: '#10b981', color: '#fff' }}
                      >
                        Mark Sent
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-30"
            style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: 'var(--a-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-30"
            style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', color: 'var(--a-text)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
