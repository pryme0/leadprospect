'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useTenantTheme } from '@/lib/tenant-theme';

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
  outreach_type: string;
  status: string;
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

const TOOL_LABELS: Record<string, string> = {
  'cyber-path-finder': 'Career Path',
  'career-assessment': 'Assessment',
  'resume-analyzer': 'Resume',
};

export default function OutreachPage() {
  const theme = useTenantTheme();
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [platformFilter, setPlatformFilter] = useState('');
  const [toolFilter, setToolFilter] = useState('');
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
          adminApi.getManualDmRequired({ page, limit: 15, platform: platformFilter || undefined }),
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
            page, limit: 15,
            status: statusFilter || undefined,
            platform: platformFilter || undefined,
            tool_recommendation: toolFilter || undefined,
          }),
          adminApi.getOutreachStats(),
          adminApi.getManualDmRequired({ page: 1, limit: 1 }),
        ]);
        setMessages(queueRes.data.data);
        setTotalPages(queueRes.data.pagination.total_pages);
        setQueueTotal(queueRes.data.pagination.total);
        setStats(statsRes.data);
        setManualDmTotal(mdmCountRes.data.pagination.total);
        setManualDmByPlatform(mdmCountRes.data.by_platform || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, statusFilter, platformFilter, toolFilter, viewMode]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try { await adminApi.triggerOutreachGenerate(); await loadData(); }
    finally { setGenerating(false); }
  };

  const handleAction = async (id: string, status: 'approved' | 'sent' | 'skipped', reply?: string) => {
    try {
      await adminApi.updateOutreach(id, { status, reply });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status, suggested_reply: reply || m.suggested_reply } : m)),
      );
      setEditingId(null);
      const statsRes = await adminApi.getOutreachStats();
      setStats(statsRes.data);
    } catch { /* silent */ }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const progressPercent = stats ? Math.min(100, Math.round((stats.sent_today / stats.daily_target) * 100)) : 0;

  return (
    <div className="space-y-8 max-w-[1480px] mx-auto">
      {/* Header */}
      <header>
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2 flex items-center gap-2.5"
          style={{ fontFamily: theme.fontMono }}
        >
          <span className="text-white/55">04</span>
          <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
          <span>Outreach</span>
        </p>
        <h1 className="text-white font-bold text-3xl tracking-tight leading-[1.05]">
          Reply queue.
        </h1>
        <p className="text-white/45 text-sm mt-2 max-w-xl">
          Review, edit, and approve AI-drafted replies before they go out. Daily
          target keeps the velocity steady — failed sends loop back for retry.
        </p>
      </header>

      {/* Stats strip */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-stagger>
        <StatTile ord="01" label="Sent today" value={stats?.sent_today ?? 0} sub={`/ ${stats?.daily_target ?? 2000}`} accent={theme.accent} theme={theme} />
        <StatTile ord="02" label="Approved · ready" value={stats?.approved_total ?? 0} accent={theme.chart[1]} theme={theme} />
        <StatTile ord="03" label="Pending review" value={stats?.pending_total ?? 0} accent={theme.intent.medium} theme={theme} />
        <StatTile ord="04" label="Total sent" value={stats?.total_sent ?? 0} accent="#10b981" theme={theme} />
        <StatTile ord="05" label="Failed" value={stats?.failed_total ?? 0} sub={stats?.failed_today ? `${stats.failed_today} today` : undefined} accent={theme.intent.high} theme={theme} />
      </section>

      {/* Daily progress */}
      <section
        className="px-5 py-4"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-white/45"
            style={{ fontFamily: theme.fontMono }}
          >
            Daily progress
          </p>
          <p
            className="text-[11px] tabular-nums font-semibold"
            style={{ color: theme.accent, fontFamily: theme.fontMono }}
          >
            {progressPercent}%
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-fg-05)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${theme.accent}, ${theme.chart[1]})`,
            }}
          />
        </div>
        <p className="text-white/45 text-[11px] mt-2 tabular-nums" style={{ fontFamily: theme.fontMono }}>
          {(stats?.sent_today ?? 0).toLocaleString()} / {(stats?.daily_target ?? 2000).toLocaleString()} sent
        </p>
      </section>

      {/* Tool classification */}
      {(stats?.approved_by_tool ?? []).length > 0 && (
        <section>
          <SectionHeader
            ord="06"
            title="Approved by tool"
            subtitle="Click a tile to filter the queue below"
            theme={theme}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats!.approved_by_tool.map((t) => {
              const isActive = toolFilter === t.tool;
              return (
                <button
                  key={t.tool}
                  onClick={() => { setToolFilter(isActive ? '' : t.tool); setPage(1); }}
                  className="text-left p-5 transition-all hover:-translate-y-0.5"
                  style={{
                    background: isActive ? 'var(--t-accent-soft)' : 'var(--a-card)',
                    border: `1px solid ${isActive ? 'var(--t-accent-soft)' : 'var(--a-border)'}`,
                    borderRadius: 'var(--t-radius)',
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-[0.22em] text-white/45 mb-2"
                    style={{ fontFamily: theme.fontMono }}
                  >
                    {TOOL_LABELS[t.tool] || t.tool}
                  </p>
                  <p
                    className="font-bold tabular-nums leading-none"
                    style={{
                      color: isActive ? theme.accent : 'var(--t-fg-95)',
                      fontSize: 'clamp(2rem, 3vw, 2.6rem)',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {t.count}
                  </p>
                  <p
                    className="text-white/40 text-[11px] mt-2 uppercase tracking-[0.18em]"
                    style={{ fontFamily: theme.fontMono }}
                  >
                    leads ready
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* View toggle */}
      <section className="flex items-center gap-2 flex-wrap">
        <ViewTab
          active={viewMode === 'queue'}
          onClick={() => { setViewMode('queue'); setPage(1); }}
          theme={theme}
        >
          Queue
        </ViewTab>
        <ViewTab
          active={viewMode === 'manual_dm'}
          onClick={() => { setViewMode('manual_dm'); setPage(1); }}
          theme={theme}
          tone="gold"
          badge={manualDmTotal > 0 ? manualDmTotal : undefined}
        >
          Manual DM required
        </ViewTab>
        {viewMode === 'manual_dm' && manualDmByPlatform.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2 text-[10px] uppercase tracking-[0.18em]" style={{ fontFamily: theme.fontMono }}>
            <span className="text-white/35">By platform</span>
            {manualDmByPlatform.map((p) => (
              <span
                key={p.platform}
                className="px-2 py-0.5 text-white/65"
                style={{
                  background: 'var(--t-fg-04)',
                  border: '1px solid var(--a-border2)',
                  borderRadius: 'var(--t-radius-sm)',
                }}
              >
                {p.platform} {p.count}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Toolbar */}
      <section
        className="flex flex-wrap items-center gap-2 px-4 py-3"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius)',
        }}
      >
        {viewMode === 'queue' ? (
          <>
            <span
              className="text-[10px] uppercase tracking-[0.25em] text-white/40 mr-2"
              style={{ fontFamily: theme.fontMono }}
            >
              Status
            </span>
            {['pending', 'approved', 'sent', 'failed', 'skipped', ''].map((s) => (
              <SegmentBtn
                key={s || 'all'}
                active={statusFilter === s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                theme={theme}
              >
                {s || 'All'}
                {statusFilter === s && queueTotal > 0 && (
                  <span className="ml-1 opacity-60 tabular-nums">{queueTotal}</span>
                )}
              </SegmentBtn>
            ))}
          </>
        ) : (
          <p className="text-[11px] text-white/65 max-w-2xl">
            <span
              className="font-semibold uppercase tracking-[0.18em] text-[10px] mr-2"
              style={{ color: theme.intent.medium, fontFamily: theme.fontMono }}
            >
              Manual
            </span>
            Leads where the agent detected DMs are disabled. Click <strong>Open</strong> to DM them on the original platform.
          </p>
        )}

        <div className="hidden sm:block w-px h-5 mx-1" style={{ background: 'var(--a-border2)' }} />

        <FilterPill
          label="Platform"
          value={platformFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'twitter', label: 'twitter' },
            { value: 'reddit', label: 'reddit' },
            { value: 'youtube', label: 'youtube' },
            { value: 'linkedin', label: 'linkedin' },
            { value: 'instagram', label: 'instagram' },
          ]}
          onChange={(v) => { setPlatformFilter(v); setPage(1); }}
          theme={theme}
        />

        <FilterPill
          label="Tool"
          value={toolFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'cyber-path-finder', label: 'Path' },
            { value: 'career-assessment', label: 'Assessment' },
            { value: 'resume-analyzer', label: 'Resume' },
          ]}
          onChange={(v) => { setToolFilter(v); setPage(1); }}
          theme={theme}
        />

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <BulkBtn theme={theme} tone="gold" onClick={async () => { await adminApi.bulkApproveOutreach(); await loadData(); }}>
            Approve all pending
          </BulkBtn>
          <BulkBtn theme={theme} tone="ghost" onClick={async () => { await adminApi.retryFailedOutreach(); await loadData(); }}>
            Retry failed
          </BulkBtn>
          <BulkBtn theme={theme} tone="green" onClick={async () => { await adminApi.triggerOutreachSend(); await loadData(); }}>
            Send approved
          </BulkBtn>
          <BulkBtn
            theme={theme}
            tone="primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Generating
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate replies
              </>
            )}
          </BulkBtn>
        </div>
      </section>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--t-fg-06)', borderTopColor: theme.accent }}
          />
        </div>
      ) : messages.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
          }}
        >
          <div className="h-px w-12" style={{ background: 'var(--a-border2)' }} />
          <p className="text-white/55 text-sm">No messages in queue</p>
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-white/30"
            style={{ fontFamily: theme.fontMono }}
          >
            Click "Generate replies" above
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-stagger>
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              theme={theme}
              viewMode={viewMode}
              editingId={editingId}
              editText={editText}
              copied={copied === msg.id}
              onSelect={() => {}}
              onCopy={() => copyToClipboard(msg.suggested_reply, msg.id)}
              onApprove={() => handleAction(msg.id, 'approved')}
              onApproveEdit={() => handleAction(msg.id, 'approved', editText)}
              onMarkSent={() => handleAction(msg.id, 'sent')}
              onSkip={() => handleAction(msg.id, 'skipped')}
              onEditStart={() => { setEditingId(msg.id); setEditText(msg.suggested_reply); }}
              onEditCancel={() => setEditingId(null)}
              onEditChange={setEditText}
              onConvertDm={async () => { await adminApi.convertDmToReply(msg.id); await loadData(); }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p
            className="text-[10px] uppercase tracking-[0.25em] text-white/40 tabular-nums"
            style={{ fontFamily: theme.fontMono }}
          >
            Page {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
          </p>
          <div className="flex gap-2">
            <PaginationButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} theme={theme}>
              ← Prev
            </PaginationButton>
            <PaginationButton onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} theme={theme}>
              Next →
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function SectionHeader({
  ord, title, subtitle, theme,
}: {
  ord: string;
  title: string;
  subtitle?: string;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="text-[10px] tracking-[0.3em] text-white/35 tabular-nums" style={{ fontFamily: theme.fontMono }}>
        {ord}
      </span>
      <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
      <div>
        <h2 className="text-white font-semibold text-sm tracking-tight">{title}</h2>
        {subtitle && <p className="text-white/35 text-[11px] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatTile({
  ord, label, value, sub, accent, theme,
}: {
  ord: string;
  label: string;
  value: number;
  sub?: string;
  accent: string;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <div
      className="px-5 py-5"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span
          className="text-[9px] tabular-nums tracking-[0.2em] text-white/30"
          style={{ fontFamily: theme.fontMono }}
        >
          {ord}
        </span>
      </div>
      <p
        className="font-bold tabular-nums leading-none mt-3"
        style={{ color: accent, fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)', letterSpacing: '-0.03em' }}
      >
        {value.toLocaleString()}
        {sub && <span className="text-white/30 text-sm font-medium ml-1">{sub}</span>}
      </p>
      <p
        className="text-[10px] uppercase tracking-[0.22em] text-white/45 mt-2"
        style={{ fontFamily: theme.fontMono }}
      >
        {label}
      </p>
    </div>
  );
}

function ViewTab({
  active, onClick, theme, children, tone, badge,
}: {
  active: boolean;
  onClick: () => void;
  theme: ReturnType<typeof useTenantTheme>;
  children: React.ReactNode;
  tone?: 'gold';
  badge?: number;
}) {
  const accentColor = tone === 'gold' ? theme.intent.medium : theme.accent;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.18em] font-semibold transition-colors"
      style={{
        fontFamily: theme.fontMono,
        background: active ? accentColor : 'transparent',
        color: active ? (tone === 'gold' ? '#000' : theme.accentOn) : 'var(--t-fg-70)',
        border: `1px solid ${active ? accentColor : 'var(--a-border2)'}`,
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {children}
      {badge !== undefined && (
        <span
          className="px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
          style={{
            background: active ? '#000' : accentColor,
            color: active ? accentColor : '#000',
            borderRadius: 'var(--t-radius-sm)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SegmentBtn({
  children, active, onClick, theme,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors capitalize"
      style={{
        fontFamily: theme.fontMono,
        background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-02)',
        color: active ? theme.accent : 'var(--t-fg-55)',
        border: `1px solid ${active ? 'var(--t-accent-soft)' : 'var(--a-border2)'}`,
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {children}
    </button>
  );
}

function FilterPill({
  label, value, options, onChange, theme,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  const active = value !== '';
  return (
    <label
      className="relative flex items-center gap-2 pl-3 pr-2 py-1.5 transition-colors cursor-pointer"
      style={{
        background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-02)',
        border: `1px solid ${active ? 'var(--t-accent-soft)' : 'var(--a-border2)'}`,
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.22em] font-semibold"
        style={{
          fontFamily: theme.fontMono,
          color: active ? theme.accent : 'var(--t-fg-55)',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white text-xs font-medium focus:outline-none capitalize cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0d1e30]">{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function BulkBtn({
  theme, tone, onClick, disabled, children,
}: {
  theme: ReturnType<typeof useTenantTheme>;
  tone: 'primary' | 'gold' | 'green' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const styleMap = {
    primary: { bg: theme.accent, fg: theme.accentOn, border: theme.accent },
    gold:    { bg: theme.intent.medium, fg: '#000', border: theme.intent.medium },
    green:   { bg: '#10b981', fg: '#000', border: '#10b981' },
    ghost:   { bg: 'transparent', fg: 'var(--t-fg-70)', border: 'var(--t-fg-12)' },
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        fontFamily: theme.fontMono,
        background: styleMap.bg,
        color: styleMap.fg,
        border: `1px solid ${styleMap.border}`,
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {children}
    </button>
  );
}

function PaginationButton({
  children, onClick, disabled, theme,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.04]"
      style={{
        fontFamily: theme.fontMono,
        border: '1px solid var(--a-border2)',
        color: 'var(--t-fg-70)',
        borderRadius: 'var(--t-radius-sm)',
      }}
    >
      {children}
    </button>
  );
}

function ToneBadge({
  children, tone, theme, title,
}: {
  children: React.ReactNode;
  tone: 'accent' | 'green' | 'gold' | 'blue' | 'red' | 'mute' | 'purple';
  theme: ReturnType<typeof useTenantTheme>;
  title?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    accent: { bg: 'var(--t-accent-soft)', fg: theme.accent },
    green:  { bg: 'rgba(16,185,129,0.12)', fg: '#34d399' },
    gold:   { bg: 'rgba(212,163,115,0.12)', fg: '#d4a373' },
    blue:   { bg: 'rgba(99,102,241,0.12)', fg: '#a5b4fc' },
    red:    { bg: 'rgba(239,68,68,0.12)',  fg: '#f87171' },
    purple: { bg: 'rgba(168,85,247,0.12)', fg: '#c4b5fd' },
    mute:   { bg: 'var(--t-fg-04)', fg: 'var(--t-fg-55)' },
  };
  const { bg, fg } = map[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize"
      style={{
        background: bg, color: fg,
        borderRadius: 'var(--t-radius-sm)',
        fontFamily: theme.fontMono,
      }}
    >
      {children}
    </span>
  );
}

function MessageCard({
  msg, theme, viewMode, editingId, editText, copied,
  onCopy, onApprove, onApproveEdit, onMarkSent, onSkip, onEditStart, onEditCancel, onEditChange, onConvertDm,
}: {
  msg: OutreachMessage;
  theme: ReturnType<typeof useTenantTheme>;
  viewMode: 'queue' | 'manual_dm';
  editingId: string | null;
  editText: string;
  copied: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onApprove: () => void;
  onApproveEdit: () => void;
  onMarkSent: () => void;
  onSkip: () => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditChange: (v: string) => void;
  onConvertDm: () => void;
}) {
  const platformColor = theme.platform[msg.platform] || theme.chart[3];
  const intentTone: 'red' | 'gold' | 'blue' | 'mute' =
    msg.intent_level === 'HIGH_INTENT' ? 'red'
    : msg.intent_level === 'MEDIUM_INTENT' ? 'gold'
    : msg.intent_level === 'LOW_INTENT' ? 'blue'
    : 'mute';
  const statusTone: 'gold' | 'accent' | 'green' | 'red' | 'mute' =
    msg.status === 'pending' ? 'gold'
    : msg.status === 'approved' ? 'accent'
    : msg.status === 'sent' ? 'green'
    : msg.status === 'failed' ? 'red'
    : 'mute';

  return (
    <article
      className="overflow-hidden"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--a-border)' }}>
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: platformColor, boxShadow: `0 0 8px ${platformColor}80` }} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate max-w-[180px]">
              {msg.name || `@${msg.username}`}
            </span>
            {msg.name && msg.username && msg.username !== msg.name && !/^ACoAA/i.test(msg.username) && (
              <span
                className="text-[10px] text-white/40 truncate max-w-[140px]"
                style={{ fontFamily: theme.fontMono }}
              >
                @{msg.username}
              </span>
            )}
            <ToneBadge tone={intentTone} theme={theme}>
              {(msg.intent_level || 'unc').replace('_INTENT', '').toLowerCase()}
            </ToneBadge>
            {msg.urgency_score > 0 && (
              <span
                className="text-[10px] text-white/45 tabular-nums"
                style={{ fontFamily: theme.fontMono }}
              >
                u·{msg.urgency_score}
              </span>
            )}
          </div>
          <p
            className="text-[10px] text-white/35 mt-0.5 truncate uppercase tracking-[0.18em]"
            style={{ fontFamily: theme.fontMono }}
          >
            {msg.platform} · {msg.intent_category} · {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <ToneBadge tone="accent" theme={theme}>
            {TOOL_LABELS[msg.tool_recommendation] || msg.tool_recommendation}
          </ToneBadge>
          <ToneBadge tone={msg.outreach_type === 'dm' ? 'purple' : 'mute'} theme={theme}>
            {msg.outreach_type === 'dm' ? 'DM' : 'Reply'}
          </ToneBadge>
          <ToneBadge tone={statusTone} theme={theme}>
            {msg.status}{msg.auto_approved ? ' · auto' : ''}
          </ToneBadge>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 grid lg:grid-cols-[minmax(0,1fr),minmax(0,1.2fr)] gap-5">
        {/* Original */}
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1.5"
            style={{ fontFamily: theme.fontMono }}
          >
            Original post
          </p>
          <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{msg.original_content}</p>
          {msg.original_url && (
            <a
              href={msg.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] mt-2 hover:underline"
              style={{ color: theme.accent }}
            >
              View original
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
              </svg>
            </a>
          )}
        </div>

        {/* Suggested reply */}
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.22em] mb-1.5 font-semibold"
            style={{ color: theme.accent, fontFamily: theme.fontMono }}
          >
            AI suggested reply
          </p>
          {editingId === msg.id ? (
            <textarea
              className="w-full text-sm p-3 min-h-[100px] resize-y leading-relaxed text-white"
              style={{
                background: 'var(--t-fg-03)',
                border: '1px solid var(--a-border2)',
                borderRadius: 'var(--t-radius-sm)',
              }}
              value={editText}
              onChange={(e) => onEditChange(e.target.value)}
            />
          ) : (
            <p
              className="text-sm leading-relaxed px-3 py-2"
              style={{
                color: 'var(--t-fg-95)',
                background: 'var(--t-accent-faint)',
                borderLeft: `2px solid ${theme.accent}`,
              }}
            >
              {msg.suggested_reply}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-5 py-3 flex-wrap"
        style={{
          borderTop: '1px solid var(--a-border)',
          background: 'var(--t-fg-02)',
        }}
      >
        {viewMode === 'manual_dm' && (
          <>
            <ToneBadge tone="gold" theme={theme}>DM disabled · manual</ToneBadge>
            {msg.original_url && (
              <a
                href={msg.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-colors"
                style={{
                  fontFamily: theme.fontMono,
                  background: theme.intent.medium,
                  color: '#000',
                  borderRadius: 'var(--t-radius-sm)',
                }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                </svg>
                Open original
              </a>
            )}
            <ActionBtn theme={theme} onClick={onCopy} tone="ghost">
              {copied ? '✓ Copied' : 'Copy reply'}
            </ActionBtn>
            {msg.outreach_type === 'dm' && (
              <ActionBtn theme={theme} onClick={onConvertDm} tone="accent-soft">
                Requeue as reply
              </ActionBtn>
            )}
          </>
        )}

        {viewMode === 'queue' && msg.status === 'pending' && editingId !== msg.id && (
          <>
            <ActionBtn theme={theme} onClick={onApprove} tone="accent-soft">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </ActionBtn>
            <ActionBtn theme={theme} onClick={onEditStart} tone="ghost">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </ActionBtn>
            <button
              onClick={onSkip}
              className="text-[11px] uppercase tracking-[0.18em] font-medium text-white/45 hover:text-white transition-colors px-2"
              style={{ fontFamily: theme.fontMono }}
            >
              Skip
            </button>
          </>
        )}

        {editingId === msg.id && (
          <>
            <ActionBtn theme={theme} onClick={onApproveEdit} tone="primary">
              Save & approve
            </ActionBtn>
            <button
              onClick={onEditCancel}
              className="text-[11px] uppercase tracking-[0.18em] font-medium text-white/45 hover:text-white transition-colors px-2"
              style={{ fontFamily: theme.fontMono }}
            >
              Cancel
            </button>
          </>
        )}

        {viewMode === 'queue' && msg.status === 'failed' && (
          <>
            {msg.send_error && (
              <span
                className="text-[10px] text-red-400 truncate max-w-[260px]"
                title={msg.send_error}
              >
                {msg.send_error}
              </span>
            )}
            <ActionBtn theme={theme} onClick={onApprove} tone="accent-soft">
              Retry
            </ActionBtn>
            <button
              onClick={onSkip}
              className="text-[11px] uppercase tracking-[0.18em] font-medium text-white/45 hover:text-white transition-colors px-2"
              style={{ fontFamily: theme.fontMono }}
            >
              Skip
            </button>
          </>
        )}

        {viewMode === 'queue' && (msg.status === 'approved' || msg.status === 'sent') && (
          <>
            <ActionBtn theme={theme} onClick={onCopy} tone="accent-soft">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied' : 'Copy reply'}
            </ActionBtn>

            {msg.status === 'sent' && msg.sent_url && (
              <a
                href={msg.sent_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-colors"
                style={{
                  fontFamily: theme.fontMono,
                  background: '#10b981',
                  color: '#000',
                  borderRadius: 'var(--t-radius-sm)',
                }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path strokeLinecap="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
                </svg>
                View {msg.outreach_type === 'dm' ? 'DM' : 'comment'}
              </a>
            )}

            {msg.original_url && (
              <ActionBtn theme={theme} tone="ghost" href={msg.original_url}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                </svg>
                Go to post
              </ActionBtn>
            )}

            {msg.status === 'approved' && (
              <ActionBtn theme={theme} onClick={onMarkSent} tone="green">
                Mark sent
              </ActionBtn>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function ActionBtn({
  theme, tone, onClick, href, children,
}: {
  theme: ReturnType<typeof useTenantTheme>;
  tone: 'primary' | 'accent-soft' | 'green' | 'ghost';
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const styleMap = {
    primary: { bg: theme.accent, fg: theme.accentOn, border: theme.accent },
    'accent-soft': { bg: 'var(--t-accent-soft)', fg: theme.accent, border: 'var(--t-accent-soft)' },
    green:   { bg: '#10b981', fg: '#000', border: '#10b981' },
    ghost:   { bg: 'transparent', fg: 'var(--t-fg-70)', border: 'var(--t-fg-12)' },
  }[tone];
  const cls = "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-colors";
  const style = {
    fontFamily: theme.fontMono,
    background: styleMap.bg,
    color: styleMap.fg,
    border: `1px solid ${styleMap.border}`,
    borderRadius: 'var(--t-radius-sm)',
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}
