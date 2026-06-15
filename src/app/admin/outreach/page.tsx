'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

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
  'source-routing':     'Source Routing',
  'crm-routing':        'CRM Routing',
  'dedupe-preview':     'Dedupe Preview',
  'account-expansion':  'Expansion',
};

export default function OutreachPage() {
  const theme = useWorkspaceTheme();
  const [messages,         setMessages]         = useState<OutreachMessage[]>([]);
  const [stats,            setStats]            = useState<Stats | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [generating,       setGenerating]       = useState(false);
  const [statusFilter,     setStatusFilter]     = useState('pending');
  const [platformFilter,   setPlatformFilter]   = useState('');
  const [toolFilter,       setToolFilter]       = useState('');
  const [viewMode,         setViewMode]         = useState<'queue' | 'manual_dm'>('queue');
  const [manualDmTotal,    setManualDmTotal]    = useState<number>(0);
  const [manualDmByPlatform, setManualDmByPlatform] = useState<{ platform: string; count: number }[]>([]);
  const [page,             setPage]             = useState(1);
  const [totalPages,       setTotalPages]       = useState(1);
  const [queueTotal,       setQueueTotal]       = useState(0);
  const [editingId,        setEditingId]        = useState<string | null>(null);
  const [editText,         setEditText]         = useState('');
  const [copied,           setCopied]           = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [emailSubject,     setEmailSubject]     = useState('');
  const [emailBody,        setEmailBody]        = useState('');
  const [emailTemplate,    setEmailTemplate]    = useState<'qualified' | 'crm' | 'nurture'>('qualified');
  const [deliveryMode,     setDeliveryMode]     = useState<'test' | 'live'>('test');
  const [emailStatus,      setEmailStatus]      = useState<'idle' | 'sending' | 'sent' | 'scheduled'>('idle');
  const [deliveryLog,      setDeliveryLog]      = useState<string[]>([
    'Email composer ready. Select a route to personalize the next send.',
  ]);

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

  const selectedMessage = useMemo(() => {
    if (!messages.length) return null;
    return messages.find((message) => message.id === selectedMessageId) ?? messages[0];
  }, [messages, selectedMessageId]);

  useEffect(() => {
    if (!selectedMessage) return;
    setSelectedMessageId((current) => current ?? selectedMessage.id);
    setEmailSubject(buildEmailSubject(selectedMessage, emailTemplate));
    setEmailBody(buildEmailBody(selectedMessage, emailTemplate));
    setEmailStatus('idle');
  }, [selectedMessage?.id, emailTemplate]);

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

  const pushDeliveryLog = (message: string) => {
    setDeliveryLog((current) => [message, ...current].slice(0, 5));
  };

  const handleEmailAction = (action: 'test' | 'send' | 'schedule') => {
    if (!selectedMessage) return;
    const recipient = getRecipientEmail(selectedMessage);
    setEmailStatus('sending');
    pushDeliveryLog(`${action === 'test' ? 'Test email' : action === 'schedule' ? 'Scheduled email' : 'Email send'} queued for ${recipient}.`);

    window.setTimeout(() => {
      setEmailStatus(action === 'schedule' ? 'scheduled' : 'sent');
      pushDeliveryLog(
        action === 'test'
          ? `Test delivered to growth@prospectgrid.demo with ${selectedMessage.platform} context.`
          : action === 'schedule'
            ? `Scheduled follow-up for ${getRecipientName(selectedMessage)} tomorrow at 9:00 AM.`
            : `Email sent to ${recipient}; route marked ready for CRM follow-up.`,
      );
      if (action === 'send') {
        void handleAction(selectedMessage.id, 'sent', selectedMessage.suggested_reply);
      }
      window.setTimeout(() => setEmailStatus('idle'), 2200);
    }, 850);
  };

  const progressPercent = stats ? Math.min(100, Math.round((stats.sent_today / stats.daily_target) * 100)) : 0;

  const headerStats = [
    { label: 'Approved ready', value: stats?.approved_total ?? 0,  color: theme.accent          },
    { label: 'Pending review', value: stats?.pending_total  ?? 0,  color: '#FF9C5F'             },
    { label: 'Sent today',     value: stats?.sent_today     ?? 0,  color: '#10b981'             },
    { label: 'Manual DM',      value: manualDmTotal,                color: '#FCEFC3'             },
    { label: 'Failed',         value: stats?.failed_total   ?? 0,  color: '#EB4203'             },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">

      {/* ── Header ── */}
      <header
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          boxShadow: 'var(--t-card-shadow)',
          overflow: 'hidden',
        }}
      >
        {/* Title + stat tiles */}
        <div className="flex flex-wrap items-start justify-between gap-6 p-5 lg:p-6">
          <div className="max-w-lg">
            <p
              className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em]"
              style={{ color: theme.accent, fontFamily: theme.fontMono }}
            >
              04 · Routing desk
            </p>
            <h1 className="text-[26px] font-black leading-tight tracking-tight text-white">
              Outreach Queue
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              Review generated replies, approve routes, handle manual-DM exceptions, and keep failed sends cleared.
            </p>
          </div>

          {/* Stat tiles */}
          <div className="flex flex-wrap gap-2.5">
            {headerStats.map(({ label, value, color }) => (
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
                  {value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily progress bar */}
        <div
          className="px-5 py-3.5 lg:px-6"
          style={{ borderTop: '1px solid var(--a-border)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p
              className="text-[9px] font-bold uppercase tracking-[0.28em]"
              style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
            >
              Daily routing target
            </p>
            <p
              className="text-[11px] tabular-nums font-semibold"
              style={{ color: 'var(--t-fg-55)', fontFamily: theme.fontMono }}
            >
              {(stats?.sent_today ?? 0).toLocaleString()} / {(stats?.daily_target ?? 2000).toLocaleString()} sent · {progressPercent}%
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--t-fg-08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${theme.accent}, #FF9C5F, #EB4203)`,
              }}
            />
          </div>
        </div>
      </header>

      {/* ── Playbook tiles ── */}
      {(stats?.approved_by_tool ?? []).length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <span
              className="text-[10px] tracking-[0.3em] tabular-nums"
              style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}
            >
              06
            </span>
            <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Approved by playbook</h2>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--t-fg-35)' }}>Click a tile to filter the queue below</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {stats!.approved_by_tool.map((t) => {
              const isActive = toolFilter === t.tool;
              return (
                <button
                  key={t.tool}
                  onClick={() => { setToolFilter(isActive ? '' : t.tool); setPage(1); }}
                  className={`text-left p-5 transition-colors ${isActive ? 'pg-on-dark' : ''}`}
                  style={{
                    background: isActive ? '#112126' : 'var(--a-card)',
                    border: `1px solid ${isActive ? theme.accent + '50' : 'var(--a-border)'}`,
                    borderRadius: 'var(--t-radius)',
                  }}
                >
                  <p
                    className="mb-2 text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: isActive ? theme.accent : 'var(--t-fg-40)', fontFamily: theme.fontMono }}
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
                    className="mt-2 text-[11px] uppercase tracking-[0.18em]"
                    style={{ color: isActive ? theme.accent + 'aa' : 'var(--t-fg-40)', fontFamily: theme.fontMono }}
                  >
                    leads ready
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── View toggle ── */}
      <div
        className="flex flex-wrap items-center gap-2 p-2"
        style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', borderRadius: 'var(--t-radius-lg)' }}
      >
        <ViewTab active={viewMode === 'queue'} onClick={() => { setViewMode('queue'); setPage(1); }} theme={theme}>
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
          <div
            className="ml-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em]"
            style={{ fontFamily: theme.fontMono }}
          >
            <span style={{ color: 'var(--t-fg-35)' }}>By platform</span>
            {manualDmByPlatform.map((p) => (
              <span
                key={p.platform}
                className="px-2 py-0.5"
                style={{
                  color: 'var(--t-fg-60)',
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
      </div>

      {/* ── Toolbar ── */}
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
              className="mr-2 text-[10px] uppercase tracking-[0.25em]"
              style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
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
                  <span className="ml-1 tabular-nums opacity-60">{queueTotal}</span>
                )}
              </SegmentBtn>
            ))}
          </>
        ) : (
          <p className="max-w-2xl text-[11px]" style={{ color: 'var(--t-fg-60)' }}>
            <span
              className="mr-2 text-[10px] uppercase tracking-[0.18em]"
              style={{ color: theme.intent.medium, fontFamily: theme.fontMono }}
            >
              Manual
            </span>
            Leads where the agent detected DMs are disabled. Click <strong>Open</strong> to DM them on the original platform.
          </p>
        )}

        <div className="mx-1 hidden h-5 w-px sm:block" style={{ background: 'var(--a-border2)' }} />

        <FilterPill
          label="Platform"
          value={platformFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'twitter',   label: 'twitter'   },
            { value: 'reddit',    label: 'reddit'    },
            { value: 'youtube',   label: 'youtube'   },
            { value: 'linkedin',  label: 'linkedin'  },
            { value: 'instagram', label: 'instagram' },
          ]}
          onChange={(v) => { setPlatformFilter(v); setPage(1); }}
          theme={theme}
        />

        <FilterPill
          label="Source"
          value={toolFilter}
          options={[
            { value: '',                  label: 'All'            },
            { value: 'source-routing',    label: 'Source Routing' },
            { value: 'crm-routing',       label: 'CRM Routing'    },
            { value: 'dedupe-preview',    label: 'Dedupe'         },
            { value: 'account-expansion', label: 'Expansion'      },
          ]}
          onChange={(v) => { setToolFilter(v); setPage(1); }}
          theme={theme}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <BulkBtn theme={theme} tone="gold"    onClick={async () => { await adminApi.bulkApproveOutreach();  await loadData(); }}>Approve all pending</BulkBtn>
          <BulkBtn theme={theme} tone="ghost"   onClick={async () => { await adminApi.retryFailedOutreach();  await loadData(); }}>Retry failed</BulkBtn>
          <BulkBtn theme={theme} tone="green"   onClick={async () => { await adminApi.triggerOutreachSend(); await loadData(); }}>Send approved</BulkBtn>
          <BulkBtn theme={theme} tone="primary" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate replies
              </>
            )}
          </BulkBtn>
        </div>
      </section>

      <EmailComposer
        message={selectedMessage}
        subject={emailSubject}
        body={emailBody}
        template={emailTemplate}
        deliveryMode={deliveryMode}
        status={emailStatus}
        log={deliveryLog}
        theme={theme}
        onSubjectChange={setEmailSubject}
        onBodyChange={setEmailBody}
        onTemplateChange={setEmailTemplate}
        onDeliveryModeChange={setDeliveryMode}
        onSendTest={() => handleEmailAction('test')}
        onSendNow={() => handleEmailAction(deliveryMode === 'test' ? 'test' : 'send')}
        onSchedule={() => handleEmailAction('schedule')}
      />

      {/* ── Queue ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }}
          />
        </div>
      ) : messages.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-16"
          style={{
            background: 'var(--a-card)',
            border: '1px solid var(--a-border)',
            borderRadius: 'var(--t-radius-lg)',
          }}
        >
          <div className="h-px w-12" style={{ background: 'var(--a-border2)' }} />
          <p className="text-sm text-white/50">No messages in queue</p>
          <p
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--t-fg-30)', fontFamily: theme.fontMono }}
          >
            Click "Generate replies" above
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              theme={theme}
              viewMode={viewMode}
              editingId={editingId}
              editText={editText}
              copied={copied === msg.id}
              selected={selectedMessage?.id === msg.id}
              onSelect={() => setSelectedMessageId(msg.id)}
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p
            className="text-[10px] uppercase tracking-[0.25em] tabular-nums"
            style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
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

function getRecipientName(message: OutreachMessage) {
  return message.name || message.username.replace(/^@/, '') || 'there';
}

function getRecipientEmail(message: OutreachMessage) {
  const slug = getRecipientName(message)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug || 'lead'}@${message.platform}.prospectgrid.demo`;
}

function buildEmailSubject(message: OutreachMessage, template: 'qualified' | 'crm' | 'nurture') {
  const companyHint = message.intent_category || TOOL_LABELS[message.tool_recommendation] || 'lead routing';
  if (template === 'crm') return `Fixing the ${companyHint.toLowerCase()} handoff`;
  if (template === 'nurture') return `Useful context from your ${message.platform} signal`;
  return `${companyHint}: next best route`;
}

function buildEmailBody(message: OutreachMessage, template: 'qualified' | 'crm' | 'nurture') {
  const name = getRecipientName(message).split(' ')[0];
  const context = message.original_content.replace(/\s+/g, ' ').trim();
  const recommendation = message.suggested_reply.trim();

  if (template === 'crm') {
    return `Hi ${name},\n\nI noticed your team is looking at ${TOOL_LABELS[message.tool_recommendation] || 'lead routing'} from ${message.platform}. The useful part is not just capturing the lead, it is keeping the source, score, dedupe status, and owner assignment together before the CRM handoff.\n\n${recommendation}\n\nWould it help if I sent over a quick routing map for this workflow?\n\nBest,\nProspectGrid`;
  }

  if (template === 'nurture') {
    return `Hi ${name},\n\nSaw the ${message.platform} signal around: "${context.slice(0, 180)}${context.length > 180 ? '...' : ''}"\n\nNo hard pitch here. The pattern usually means the account is comparing source quality, CRM routing, and follow-up timing. ProspectGrid can keep that activity scored until the lead is ready for sales.\n\nWant me to share the short checklist we use for this?\n\nBest,\nProspectGrid`;
  }

  return `Hi ${name},\n\nYour recent ${message.platform} activity stood out because it points to active buying intent: ${message.intent_category || 'source and routing evaluation'}.\n\n${recommendation}\n\nIf useful, I can show how ProspectGrid would score this lead, dedupe it, and route it to the right owner before the next campaign sync.\n\nBest,\nProspectGrid`;
}

function EmailComposer({
  message,
  subject,
  body,
  template,
  deliveryMode,
  status,
  log,
  theme,
  onSubjectChange,
  onBodyChange,
  onTemplateChange,
  onDeliveryModeChange,
  onSendTest,
  onSendNow,
  onSchedule,
}: {
  message: OutreachMessage | null;
  subject: string;
  body: string;
  template: 'qualified' | 'crm' | 'nurture';
  deliveryMode: 'test' | 'live';
  status: 'idle' | 'sending' | 'sent' | 'scheduled';
  log: string[];
  theme: ReturnType<typeof useWorkspaceTheme>;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onTemplateChange: (value: 'qualified' | 'crm' | 'nurture') => void;
  onDeliveryModeChange: (value: 'test' | 'live') => void;
  onSendTest: () => void;
  onSendNow: () => void;
  onSchedule: () => void;
}) {
  if (!message) {
    return (
      <section
        className="p-5"
        style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', borderRadius: 'var(--t-radius-lg)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--t-fg-95)' }}>Email composer</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--t-fg-55)' }}>Generate or select an outreach route to prepare an email.</p>
      </section>
    );
  }

  const recipient = getRecipientEmail(message);
  const recipientName = getRecipientName(message);
  const disabled = status === 'sending';

  return (
    <section
      className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr),360px]"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
        boxShadow: 'var(--t-card-shadow)',
      }}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: theme.accent, fontFamily: theme.fontMono }}>
              Email sending desk
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight" style={{ color: 'var(--t-fg-95)' }}>
              Compose follow-up
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'qualified', label: 'Qualified route' },
              { value: 'crm', label: 'CRM handoff' },
              { value: 'nurture', label: 'Nurture' },
            ].map((item) => {
              const active = template === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => onTemplateChange(item.value as 'qualified' | 'crm' | 'nurture')}
                  className="min-h-10 rounded-lg border px-3 text-xs font-semibold transition"
                  style={{
                    background: active ? theme.accentSoft : 'var(--t-fg-04)',
                    borderColor: active ? `${theme.accent}55` : 'var(--a-border)',
                    color: active ? theme.accent : 'var(--t-fg-70)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
              To
            </span>
            <input
              value={`${recipientName} <${recipient}>`}
              readOnly
              className="h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ background: 'var(--t-fg-03)', borderColor: 'var(--a-border)', color: 'var(--t-fg-85)' }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
              From
            </span>
            <input
              value="ProspectGrid Growth <growth@prospectgrid.demo>"
              readOnly
              className="h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ background: 'var(--t-fg-03)', borderColor: 'var(--a-border)', color: 'var(--t-fg-85)' }}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            Subject
          </span>
          <input
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            className="h-11 w-full rounded-lg border px-3 text-sm font-semibold outline-none focus:ring-2"
            style={{
              background: 'var(--a-card2)',
              borderColor: 'var(--a-border)',
              color: 'var(--t-fg-95)',
              caretColor: theme.accent,
            }}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            Body
          </span>
          <textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            className="min-h-[220px] w-full resize-y rounded-lg border p-3 text-sm leading-6 outline-none focus:ring-2"
            style={{
              background: 'var(--a-card2)',
              borderColor: 'var(--a-border)',
              color: 'var(--t-fg-85)',
              caretColor: theme.accent,
            }}
          />
        </label>
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border p-4" style={{ background: 'var(--t-fg-03)', borderColor: 'var(--a-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            Send controls
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['test', 'live'] as const).map((mode) => {
              const active = deliveryMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onDeliveryModeChange(mode)}
                  className="min-h-11 rounded-lg border px-3 text-xs font-bold uppercase tracking-[0.16em]"
                  style={{
                    background: active ? theme.accentSoft : 'var(--a-card)',
                    borderColor: active ? `${theme.accent}55` : 'var(--a-border)',
                    color: active ? theme.accent : 'var(--t-fg-70)',
                    fontFamily: theme.fontMono,
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2">
            <ActionBtn theme={theme} tone="ghost" onClick={onSendTest}>Send test</ActionBtn>
            <ActionBtn theme={theme} tone="accent-soft" onClick={onSchedule}>Schedule follow-up</ActionBtn>
            <ActionBtn theme={theme} tone="primary" onClick={onSendNow}>
              {disabled ? 'Sending...' : deliveryMode === 'test' ? 'Run test send' : 'Send email'}
            </ActionBtn>
          </div>
          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--t-fg-55)' }}>
            Demo mode keeps sends local, but the interface models approval, test-send, scheduling, and live delivery.
          </p>
        </div>

        <div className="rounded-xl border p-4" style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            Delivery log
          </p>
          <div className="mt-3 space-y-2">
            {log.map((item, index) => (
              <div key={`${item}-${index}`} className="grid grid-cols-[10px,1fr] gap-2 text-xs leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ background: index === 0 ? theme.accent : 'var(--t-fg-25)' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────────

function ViewTab({
  active, onClick, theme, children, tone, badge,
}: {
  active: boolean;
  onClick: () => void;
  theme: ReturnType<typeof useWorkspaceTheme>;
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
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors capitalize"
      style={{
        fontFamily: theme.fontMono,
        background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-04)',
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
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  const active = value !== '';
  return (
    <label
      className="relative flex cursor-pointer items-center gap-2 py-1.5 pl-3 pr-2 transition-colors"
      style={{
        background: active ? 'var(--t-accent-soft)' : 'var(--t-fg-04)',
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
        className="cursor-pointer bg-transparent text-xs font-medium capitalize text-white focus:outline-none"
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
  theme: ReturnType<typeof useWorkspaceTheme>;
  tone: 'primary' | 'gold' | 'green' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const styleMap = {
    primary: { bg: theme.accent,          fg: theme.accentOn,      border: theme.accent           },
    gold:    { bg: theme.intent.medium,   fg: '#000',              border: theme.intent.medium    },
    green:   { bg: '#10b981',             fg: '#000',              border: '#10b981'              },
    ghost:   { bg: 'transparent',         fg: 'var(--t-fg-70)',    border: 'var(--t-fg-12)'      },
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:bg-white/[0.03]"
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
  theme: ReturnType<typeof useWorkspaceTheme>;
  title?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    accent: { bg: theme.accentSoft,              fg: theme.accent   },
    green:  { bg: 'rgba(16,185,129,0.12)',        fg: '#34d399'      },
    gold:   { bg: 'rgba(212,163,115,0.12)',       fg: '#d4a373'      },
    blue:   { bg: 'rgba(99,102,241,0.12)',        fg: '#a5b4fc'      },
    red:    { bg: 'rgba(239,68,68,0.12)',         fg: '#f87171'      },
    purple: { bg: 'rgba(168,85,247,0.12)',        fg: '#c4b5fd'      },
    mute:   { bg: 'var(--t-fg-04)',              fg: 'var(--t-fg-55)'},
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
  selected, onSelect, onCopy, onApprove, onApproveEdit, onMarkSent, onSkip, onEditStart, onEditCancel, onEditChange, onConvertDm,
}: {
  msg: OutreachMessage;
  theme: ReturnType<typeof useWorkspaceTheme>;
  viewMode: 'queue' | 'manual_dm';
  editingId: string | null;
  editText: string;
  copied: boolean;
  selected: boolean;
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
    msg.intent_level === 'HIGH_INTENT'   ? 'red'
    : msg.intent_level === 'MEDIUM_INTENT' ? 'gold'
    : msg.intent_level === 'LOW_INTENT'    ? 'blue'
    : 'mute';
  const statusTone: 'gold' | 'accent' | 'green' | 'red' | 'mute' =
    msg.status === 'pending'  ? 'gold'
    : msg.status === 'approved' ? 'accent'
    : msg.status === 'sent'     ? 'green'
    : msg.status === 'failed'   ? 'red'
    : 'mute';

  const borderColor =
    msg.status === 'failed'   ? 'rgba(235,66,3,0.30)'
    : msg.status === 'approved' ? `${theme.accent}40`
    : 'var(--a-border)';

  return (
    <article
      style={{
        background: 'var(--a-card)',
        border: `1px solid ${selected ? theme.accent : borderColor}`,
        borderRadius: 'var(--t-radius-lg)',
        boxShadow: selected
          ? `inset 4px 0 0 ${theme.accent}, 0 0 0 1px ${theme.accentSoft}, var(--t-card-shadow)`
          : `inset 4px 0 0 ${platformColor}, var(--t-card-shadow)`,
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr),auto]"
        style={{ borderBottom: '1px solid var(--a-border)' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="max-w-[240px] truncate text-base font-black" style={{ color: 'var(--t-fg-95)' }}>
                {msg.name || `@${msg.username}`}
              </span>
              {msg.name && msg.username && msg.username !== msg.name && !/^ACoAA/i.test(msg.username) && (
                <span
                  className="max-w-[140px] truncate text-[10px]"
                  style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
                >
                  @{msg.username}
                </span>
              )}
              <ToneBadge tone={intentTone} theme={theme}>
                {(msg.intent_level || 'unc').replace('_INTENT', '').toLowerCase()}
              </ToneBadge>
              {msg.urgency_score > 0 && (
                <span
                  className="text-[10px] tabular-nums"
                  style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
                >
                  urgency {msg.urgency_score}
                </span>
              )}
            </div>
            <p
              className="mt-1 truncate text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}
            >
              {msg.platform} · {msg.intent_category} · {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
          <ToneBadge tone="accent" theme={theme}>
            {TOOL_LABELS[msg.tool_recommendation] || msg.tool_recommendation}
          </ToneBadge>
          <ToneBadge tone={msg.outreach_type === 'dm' ? 'purple' : 'mute'} theme={theme}>
            {msg.outreach_type === 'dm' ? 'DM' : 'Reply'}
          </ToneBadge>
          <ToneBadge tone={statusTone} theme={theme}>
            {msg.status}{msg.auto_approved ? ' · auto' : ''}
          </ToneBadge>
          {selected && <ToneBadge tone="green" theme={theme}>Composing</ToneBadge>}
        </div>
      </div>

      {/* Card body */}
      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
        {/* Original */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--t-fg-03)', border: '1px solid var(--a-border)' }}>
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}
          >
            Source context
          </p>
          <p className="line-clamp-4 text-sm leading-relaxed" style={{ color: 'var(--t-fg-70)' }}>{msg.original_content}</p>
          {msg.original_url && (
            <a
              href={msg.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] hover:underline"
              style={{ color: theme.accent }}
            >
              View original
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
              </svg>
            </a>
          )}
        </div>

        {/* Suggested reply */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--t-accent-faint)', border: '1px solid var(--t-accent-soft)' }}>
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: theme.accent, fontFamily: theme.fontMono }}
          >
            Route recommendation
          </p>
          {editingId === msg.id ? (
            <textarea
              className="min-h-[120px] w-full resize-y p-3 text-sm leading-relaxed"
              style={{
                background: 'var(--a-card)',
                border: '1px solid var(--a-border2)',
                borderRadius: 'var(--t-radius-sm)',
                color: 'var(--t-fg-85)',
              }}
              value={editText}
              onChange={(e) => onEditChange(e.target.value)}
            />
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--t-fg-85)' }}>
              {msg.suggested_reply}
            </p>
          )}
        </div>
      </div>

      {/* Card actions */}
      <div
        className="flex flex-wrap items-center gap-2 px-5 py-3"
        style={{ borderTop: '1px solid var(--a-border)', background: 'var(--t-fg-02)' }}
      >
        {viewMode === 'manual_dm' && (
          <>
            <ToneBadge tone="gold" theme={theme}>DM disabled · manual</ToneBadge>
            <ActionBtn theme={theme} onClick={onSelect} tone={selected ? 'green' : 'accent-soft'}>
              Compose email
            </ActionBtn>
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
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
            <ActionBtn theme={theme} onClick={onSelect} tone={selected ? 'green' : 'accent-soft'}>
              Compose email
            </ActionBtn>
            <ActionBtn theme={theme} onClick={onApprove} tone="accent-soft">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </ActionBtn>
            <ActionBtn theme={theme} onClick={onEditStart} tone="ghost">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </ActionBtn>
            <button
              onClick={onSkip}
              className="px-2 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors hover:text-white"
              style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
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
              className="px-2 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors hover:text-white"
              style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
            >
              Cancel
            </button>
          </>
        )}

        {viewMode === 'queue' && msg.status === 'failed' && (
          <>
            {msg.send_error && (
              <span
                className="max-w-[260px] truncate text-[10px] text-red-400"
                title={msg.send_error}
              >
                {msg.send_error}
              </span>
            )}
            <ActionBtn theme={theme} onClick={onSelect} tone={selected ? 'green' : 'accent-soft'}>Compose email</ActionBtn>
            <ActionBtn theme={theme} onClick={onApprove} tone="accent-soft">Retry</ActionBtn>
            <button
              onClick={onSkip}
              className="px-2 text-[11px] uppercase tracking-[0.18em] font-medium transition-colors hover:text-white"
              style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
            >
              Skip
            </button>
          </>
        )}

        {viewMode === 'queue' && (msg.status === 'approved' || msg.status === 'sent') && (
          <>
            <ActionBtn theme={theme} onClick={onSelect} tone={selected ? 'green' : 'accent-soft'}>
              Compose email
            </ActionBtn>
            <ActionBtn theme={theme} onClick={onCopy} tone="accent-soft">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path strokeLinecap="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
                </svg>
                View {msg.outreach_type === 'dm' ? 'DM' : 'comment'}
              </a>
            )}

            {msg.original_url && (
              <ActionBtn theme={theme} tone="ghost" href={msg.original_url}>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                </svg>
                Go to post
              </ActionBtn>
            )}

            {msg.status === 'approved' && (
              <ActionBtn theme={theme} onClick={onMarkSent} tone="green">Mark sent</ActionBtn>
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
  theme: ReturnType<typeof useWorkspaceTheme>;
  tone: 'primary' | 'accent-soft' | 'green' | 'ghost';
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const styleMap = {
    primary:       { bg: theme.accent,              fg: theme.accentOn,      border: theme.accent              },
    'accent-soft': { bg: 'var(--t-accent-soft)',    fg: theme.accent,        border: 'var(--t-accent-soft)'   },
    green:         { bg: '#10b981',                 fg: '#000',              border: '#10b981'                 },
    ghost:         { bg: 'transparent',             fg: 'var(--t-fg-70)',    border: 'var(--t-fg-12)'         },
  }[tone];
  const cls = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] font-semibold transition-colors';
  const style: React.CSSProperties = {
    fontFamily: theme.fontMono,
    background: styleMap.bg,
    color: styleMap.fg,
    border: `1px solid ${styleMap.border}`,
    borderRadius: 'var(--t-radius-sm)',
  };
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{children}</a>;
  }
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}
