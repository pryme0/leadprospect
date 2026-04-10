'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';

interface OutreachMessage {
  id: string;
  signal_id: string;
  platform: string;
  username: string;
  original_content: string;
  original_url: string;
  tool_recommendation: string;
  suggested_reply: string;
  outreach_type: string; // reply | dm
  status: string; // pending | approved | sent | skipped | failed
  auto_approved: boolean;
  send_error: string | null;
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
  failed_by_platform: { platform: string; count: number }[];
  top_failure_reasons: { reason: string; count: number }[];
}

const PLATFORM_ICONS: Record<string, string> = {
  twitter: 'X',
  reddit: 'R',
  youtube: 'YT',
  linkedin: 'in',
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  reddit: '#FF4500',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
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

export default function OutreachPage() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [platformFilter, setPlatformFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        adminApi.getOutreachQueue({
          page,
          limit: 15,
          status: statusFilter || undefined,
          platform: platformFilter || undefined,
        }),
        adminApi.getOutreachStats(),
      ]);
      setMessages(queueRes.data.data);
      setTotalPages(queueRes.data.pagination.total_pages);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load outreach data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, platformFilter]);

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

      {/* Failure breakdown — only shown if there are failures */}
      {(stats?.failed_total ?? 0) > 0 && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--a-text)' }}>
              Failed Outreach Breakdown
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* By platform */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--a-muted)' }}>By Platform</p>
              <div className="space-y-1.5">
                {(stats?.failed_by_platform ?? []).length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--a-muted)' }}>No failures</p>
                )}
                {(stats?.failed_by_platform ?? []).map((p) => {
                  const max = Math.max(...(stats?.failed_by_platform ?? []).map((x) => x.count));
                  const pct = max > 0 ? (p.count / max) * 100 : 0;
                  return (
                    <div key={p.platform} className="flex items-center gap-3">
                      <span className="text-xs capitalize w-16" style={{ color: 'var(--a-text)' }}>{p.platform}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--a-hover)' }}>
                        <div className="h-full bg-red-500/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--a-text)' }}>{p.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top failure reasons */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--a-muted)' }}>Top Failure Reasons</p>
              <div className="space-y-1.5">
                {(stats?.top_failure_reasons ?? []).length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--a-muted)' }}>No failure details</p>
                )}
                {(stats?.top_failure_reasons ?? []).map((r, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-red-400 w-6">{r.count}×</span>
                    <p className="text-xs flex-1 break-words font-mono" style={{ color: 'var(--a-muted)' }}>
                      {r.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--a-hover)' }}>
          {['pending', 'approved', 'sent', 'failed', 'skipped', ''].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={statusFilter === s ? { background: 'var(--a-card)', color: '#0BAAEF' } : { color: 'var(--a-muted)' }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

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
                      @{msg.username}
                    </span>
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
                {msg.status === 'pending' && (
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

                {msg.status === 'failed' && (
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

                {(msg.status === 'approved' || msg.status === 'sent') && (
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
