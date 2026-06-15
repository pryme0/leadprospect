'use client';

import { useMemo, useState } from 'react';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

type TemplateKey = 'intro' | 'handoff' | 'nurture';
type SendState = 'idle' | 'sending' | 'sent' | 'scheduled';

interface EmailLead {
  id: string;
  name: string;
  email: string;
  company: string;
  source: string;
  intent: string;
  score: number;
  context: string;
}

const LEADS: EmailLead[] = [
  {
    id: 'lead_2001',
    name: 'Maria Okafor',
    email: 'maria@northstarclinics.example',
    company: 'Northstar Clinics',
    source: 'Google Ads',
    intent: 'High intent',
    score: 91,
    context: 'Pricing visit, multi-location healthcare form, and valid Google click identifier.',
  },
  {
    id: 'lead_2004',
    name: 'Samuel Reed',
    email: 'samuel@asterlogistics.example',
    company: 'Aster Logistics',
    source: 'LinkedIn Ads',
    intent: 'Salesforce dedupe',
    score: 73,
    context: 'Asked about Salesforce dedupe, campaign attribution, and owner assignment.',
  },
  {
    id: 'lead_2002',
    name: 'Daniel Patel',
    email: 'daniel@beaconfinancial.example',
    company: 'Beacon Financial',
    source: 'CRM Import',
    intent: 'Expansion account',
    score: 88,
    context: 'Existing account with fresh buying committee activity and expansion routing signal.',
  },
];

function buildSubject(lead: EmailLead, template: TemplateKey) {
  if (template === 'handoff') return `${lead.company}: routing the next qualified lead`;
  if (template === 'nurture') return `Useful context from your ${lead.source} activity`;
  return `${lead.company} lead routing snapshot`;
}

function buildBody(lead: EmailLead, template: TemplateKey) {
  const first = lead.name.split(' ')[0];
  if (template === 'handoff') {
    return `Hi ${first},\n\nYour ${lead.source} signal shows a clear handoff opportunity: ${lead.context}\n\nProspectGrid can keep the source, score, dedupe status, and owner assignment together before this lands in CRM.\n\nWould you like me to send the routing map for this lead?\n\nBest,\nProspectGrid`;
  }
  if (template === 'nurture') {
    return `Hi ${first},\n\nI noticed the ${lead.source} activity around ${lead.intent.toLowerCase()}.\n\nNo rush if this is early, but ProspectGrid can keep the account in nurture while tracking score changes, repeat visits, and CRM readiness.\n\nWant the short checklist for deciding when to route it?\n\nBest,\nProspectGrid`;
  }
  return `Hi ${first},\n\nA recent ${lead.source} signal from ${lead.company} scored ${lead.score}/100 in ProspectGrid.\n\nThe reason: ${lead.context}\n\nI can show how we would enrich, score, dedupe, and route this lead before the next campaign sync.\n\nBest,\nProspectGrid`;
}

export default function EmailDeskPage() {
  const theme = useWorkspaceTheme();
  const [selectedId, setSelectedId] = useState(LEADS[0].id);
  const [template, setTemplate] = useState<TemplateKey>('intro');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [log, setLog] = useState<string[]>(['Composer ready. Select a lead or edit the email directly.']);

  const selectedLead = useMemo(() => LEADS.find((lead) => lead.id === selectedId) ?? LEADS[0], [selectedId]);
  const [subject, setSubject] = useState(() => buildSubject(LEADS[0], 'intro'));
  const [body, setBody] = useState(() => buildBody(LEADS[0], 'intro'));

  function selectLead(lead: EmailLead) {
    setSelectedId(lead.id);
    setSubject(buildSubject(lead, template));
    setBody(buildBody(lead, template));
    setSendState('idle');
    setLog((current) => [`Loaded ${lead.name} from ${lead.source}.`, ...current].slice(0, 5));
  }

  function changeTemplate(next: TemplateKey) {
    setTemplate(next);
    setSubject(buildSubject(selectedLead, next));
    setBody(buildBody(selectedLead, next));
  }

  function runSend(action: 'test' | 'send' | 'schedule') {
    setSendState('sending');
    setLog((current) => [`${action === 'test' ? 'Test send' : action === 'schedule' ? 'Schedule' : 'Live send'} started for ${selectedLead.email}.`, ...current].slice(0, 5));
    window.setTimeout(() => {
      setSendState(action === 'schedule' ? 'scheduled' : 'sent');
      setLog((current) => [
        action === 'test'
          ? `Test delivered to growth@prospectgrid.demo using ${selectedLead.company} context.`
          : action === 'schedule'
            ? `Scheduled ${selectedLead.name} follow-up for tomorrow at 9:00 AM.`
            : `Email sent to ${selectedLead.email}.`,
        ...current,
      ].slice(0, 5));
      window.setTimeout(() => setSendState('idle'), 2200);
    }, 800);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header
        className="grid gap-4 p-5 lg:grid-cols-[1fr,360px]"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          boxShadow: 'var(--t-card-shadow)',
        }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: theme.accent, fontFamily: theme.fontMono }}>
            Email operations
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight" style={{ color: 'var(--t-fg-95)' }}>
            Email Desk
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>
            Compose lead follow-ups from scored signals, test delivery, schedule nurture, or simulate live sends with dummy data.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Ready', LEADS.length],
            ['Avg score', Math.round(LEADS.reduce((sum, lead) => sum + lead.score, 0) / LEADS.length)],
            ['Mode', mode],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border p-3" style={{ background: 'var(--t-fg-03)', borderColor: 'var(--a-border)' }}>
              <p className="text-2xl font-black tabular-nums" style={{ color: 'var(--t-fg-95)', fontFamily: theme.fontMono }}>{value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>{label}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[320px,minmax(0,1fr),340px]">
        <aside className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
            Lead routes
          </p>
          {LEADS.map((lead) => {
            const active = lead.id === selectedLead.id;
            return (
              <button
                key={lead.id}
                onClick={() => selectLead(lead)}
                className="w-full rounded-xl border p-4 text-left transition"
                style={{
                  background: active ? theme.accentSoft : 'var(--a-card)',
                  borderColor: active ? `${theme.accent}55` : 'var(--a-border)',
                  boxShadow: 'var(--t-card-shadow)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={{ color: 'var(--t-fg-95)' }}>{lead.name}</p>
                    <p className="mt-1 truncate text-xs" style={{ color: 'var(--t-fg-55)' }}>{lead.company}</p>
                  </div>
                  <span className="text-sm font-black tabular-nums" style={{ color: active ? theme.accent : 'var(--t-fg-70)', fontFamily: theme.fontMono }}>
                    {lead.score}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>{lead.context}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.18em]" style={{ color: active ? theme.accent : 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
                  {lead.source} · {lead.intent}
                </p>
              </button>
            );
          })}
        </aside>

        <main
          className="space-y-4 rounded-2xl border p-4"
          style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', boxShadow: 'var(--t-card-shadow)' }}
        >
          <div className="flex flex-wrap gap-2">
            {[
              ['intro', 'Intro'],
              ['handoff', 'CRM handoff'],
              ['nurture', 'Nurture'],
            ].map(([value, label]) => {
              const active = template === value;
              return (
                <button
                  key={value}
                  onClick={() => changeTemplate(value as TemplateKey)}
                  className="min-h-10 rounded-lg border px-3 text-xs font-bold uppercase tracking-[0.16em]"
                  style={{
                    background: active ? theme.accentSoft : 'var(--t-fg-04)',
                    borderColor: active ? `${theme.accent}55` : 'var(--a-border)',
                    color: active ? theme.accent : 'var(--t-fg-70)',
                    fontFamily: theme.fontMono,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="To" value={`${selectedLead.name} <${selectedLead.email}>`} readOnly theme={theme} />
            <Field label="From" value="ProspectGrid Growth <growth@prospectgrid.demo>" readOnly theme={theme} />
          </div>
          <Field label="Subject" value={subject} onChange={setSubject} theme={theme} />
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
              Body
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-[320px] w-full resize-y rounded-xl border p-4 text-sm leading-6 outline-none focus:ring-2"
              style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)', color: 'var(--t-fg-85)', caretColor: theme.accent }}
            />
          </label>
        </main>

        <aside className="space-y-4">
          <section className="rounded-2xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
              Send controls
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['test', 'live'] as const).map((item) => {
                const active = mode === item;
                return (
                  <button
                    key={item}
                    onClick={() => setMode(item)}
                    className="min-h-11 rounded-lg border px-3 text-xs font-bold uppercase tracking-[0.16em]"
                    style={{
                      background: active ? theme.accentSoft : 'var(--t-fg-04)',
                      borderColor: active ? `${theme.accent}55` : 'var(--a-border)',
                      color: active ? theme.accent : 'var(--t-fg-70)',
                      fontFamily: theme.fontMono,
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-2">
              <SendButton onClick={() => runSend('test')} disabled={sendState === 'sending'} tone="ghost" theme={theme}>Send test</SendButton>
              <SendButton onClick={() => runSend('schedule')} disabled={sendState === 'sending'} tone="soft" theme={theme}>Schedule follow-up</SendButton>
              <SendButton onClick={() => runSend(mode === 'test' ? 'test' : 'send')} disabled={sendState === 'sending'} tone="primary" theme={theme}>
                {sendState === 'sending' ? 'Sending...' : mode === 'test' ? 'Run test send' : 'Send email'}
              </SendButton>
            </div>
            {(sendState === 'sent' || sendState === 'scheduled') && (
              <p className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}>
                {sendState === 'scheduled' ? 'Follow-up scheduled.' : 'Delivery simulated successfully.'}
              </p>
            )}
          </section>

          <section className="rounded-2xl border p-4" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
              Delivery log
            </p>
            <div className="mt-3 space-y-3">
              {log.map((item, index) => (
                <div key={`${item}-${index}`} className="grid grid-cols-[10px,1fr] gap-3 text-xs leading-relaxed" style={{ color: 'var(--t-fg-60)' }}>
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ background: index === 0 ? theme.accent : 'var(--t-fg-25)' }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  readOnly,
  onChange,
  theme,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--t-fg-40)', fontFamily: theme.fontMono }}>
        {label}
      </span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
        style={{
          background: readOnly ? 'var(--t-fg-03)' : 'var(--a-card2)',
          borderColor: 'var(--a-border)',
          color: readOnly ? 'var(--t-fg-70)' : 'var(--t-fg-95)',
          caretColor: theme.accent,
        }}
      />
    </label>
  );
}

function SendButton({
  children,
  onClick,
  disabled,
  tone,
  theme,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  tone: 'primary' | 'soft' | 'ghost';
  theme: ReturnType<typeof useWorkspaceTheme>;
}) {
  const styles = {
    primary: { bg: theme.accent, color: theme.accentOn, border: theme.accent },
    soft: { bg: theme.accentSoft, color: theme.accent, border: `${theme.accent}44` },
    ghost: { bg: 'transparent', color: 'var(--t-fg-70)', border: 'var(--a-border)' },
  }[tone];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 rounded-lg border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: styles.bg, color: styles.color, borderColor: styles.border }}
    >
      {children}
    </button>
  );
}
