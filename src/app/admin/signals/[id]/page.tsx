'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface Signal {
  id: string;
  source: string;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  content: string;
  url: string;
  timestamp: string;
  intent_level: string | null;
  intent_category: string | null;
  pain_points: string[] | null;
  urgency_score: number | null;
  summary: string | null;
  processed: boolean;
  content_hash: string;
  created_at: string;
  classified_at: string | null;
  enriched_name?: string | null;
  enriched_email?: string | null;
  enriched_phone?: string | null;
  enriched_company?: string | null;
  enriched_title?: string | null;
  enriched_linkedin_url?: string | null;
  enriched_via?: string | null;
  enriched_at?: string | null;
  ghl_contact_id?: string | null;
}

export default function SignalDetailPage() {
  const theme = useWorkspaceTheme();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminApi.getSignalById(id);
        setSignal(res.data);
      } catch {
        setError('Signal not found.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleClassify = async () => {
    if (!signal) return;
    setClassifying(true);
    try {
      const res = await adminApi.classifySignal(signal.id);
      setSignal(res.data.data || res.data);
    } catch {
      setError('Classification failed. Please try again.');
    } finally {
      setClassifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--t-fg-06)', borderTopColor: theme.accent }}
        />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-32 text-center">
        <div className="h-px w-12 mx-auto" style={{ background: 'var(--a-border)' }} />
        <p style={{ color: 'var(--t-fg-55)' }}>{error || 'Signal not found.'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-xs uppercase tracking-[0.18em]"
          style={{
            border: `1px solid ${theme.accent}`,
            color: theme.accent,
            borderRadius: 'var(--t-radius-sm)',
            fontFamily: theme.fontMono,
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const displayName  = signal.enriched_name || signal.name || (signal.username && !/^ACoAA/i.test(signal.username) ? `@${signal.username}` : 'LinkedIn user');
  const displayEmail = signal.enriched_email || signal.email;
  const displayPhone = signal.enriched_phone || signal.phone;
  const company      = signal.enriched_company;
  const title        = signal.enriched_title;
  const linkedin     = signal.enriched_linkedin_url;
  const enrichedVia  = signal.enriched_via;
  const CRMId        = signal.ghl_contact_id;
  const isEnriched   = enrichedVia && enrichedVia !== 'none' && enrichedVia !== null;
  const sourceColor  = theme.platform[signal.source] || theme.chart[3];

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: 'var(--t-fg-55)' }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to signals
      </button>

      {/* ── Hero ── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
        }}
      >
        {/* Platform color top stripe — 3px, fades out to the right */}
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${sourceColor} 0%, ${sourceColor}00 70%)`,
          }}
        />

        <div className="grid items-end gap-6 p-6 lg:grid-cols-[1fr,auto] lg:p-8">
          <div>
            {/* Badges */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] capitalize"
                style={{
                  background: `${sourceColor}18`,
                  border: `1px solid ${sourceColor}35`,
                  color: sourceColor,
                  fontFamily: theme.fontMono,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: sourceColor }} />
                {signal.source}
              </span>
              <IntentBadge level={signal.intent_level} theme={theme} />
              {signal.processed
                ? <ToneBadge tone="green" theme={theme}>Processed</ToneBadge>
                : <ToneBadge tone="gold" theme={theme}>Pending</ToneBadge>}
            </div>

            {/* Name */}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl leading-[1.05]" style={{ color: 'var(--t-fg-95)' }}>
              {displayName}
            </h1>
            {signal.username && !/^ACoAA/i.test(signal.username) && (
              <p
                className="mt-2 truncate text-xs"
                style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}
                title={signal.username}
              >
                @{signal.username}
              </p>
            )}
            <p className="mt-2 text-[10px] tracking-[0.15em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
              ID · {signal.id}
            </p>
          </div>

          {!signal.processed && (
            <button
              onClick={handleClassify}
              disabled={classifying}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-tight transition-all disabled:opacity-50"
              style={{
                background: theme.accent,
                color: theme.accentOn,
                borderRadius: 'var(--t-radius-sm)',
                boxShadow: `0 12px 32px -12px ${theme.glow}`,
              }}
            >
              {classifying ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Classifying…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Score this signal
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* ── Meta strip ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4">
        {[
          { ord: '01', label: 'Source',     value: signal.source.charAt(0).toUpperCase() + signal.source.slice(1) },
          { ord: '02', label: 'Status',     value: signal.processed ? 'Processed' : 'Pending' },
          { ord: '03', label: 'Collected',  value: new Date(signal.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' }) },
          { ord: '04', label: 'Classified', value: signal.classified_at ? new Date(signal.classified_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—' },
        ].map((m, i, arr) => (
          <div
            key={m.ord}
            className="px-5 py-4"
            style={{
              background: 'var(--a-card)',
              borderTop: '1px solid var(--a-border)',
              borderBottom: '1px solid var(--a-border)',
              borderRight: i < arr.length - 1 ? '1px solid var(--a-border)' : 'none',
              borderLeft: i === 0 ? '1px solid var(--a-border)' : 'none',
              borderRadius: i === 0
                ? 'var(--t-radius) 0 0 var(--t-radius)'
                : i === arr.length - 1
                  ? '0 var(--t-radius) var(--t-radius) 0'
                  : '0',
            }}
          >
            <span className="text-[9px] tabular-nums tracking-[0.2em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
              {m.ord}
            </span>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}>
              {m.label}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium" style={{ color: 'var(--t-fg-95)' }}>{m.value}</p>
          </div>
        ))}
      </section>

      {/* ── Signal lifecycle timeline ── */}
      <SignalTimeline signal={signal} theme={theme} />

      {/* ── Lead profile + raw content ── */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">

        {(displayEmail || displayPhone || company || title || linkedin) && (
          <Card
            title="Lead profile"
            ord="05"
            right={
              isEnriched ? (
                <ToneBadge tone="green" theme={theme} title={`Enriched via ${enrichedVia}`}>
                  ✓ Enriched · {enrichedVia}
                </ToneBadge>
              ) : null
            }
          >
            <dl className="space-y-4">
              {displayEmail && (
                <ProfileRow label="Email" theme={theme}>
                  <div className="flex items-center gap-1.5">
                    {signal.enriched_email && (
                      <svg className="h-3 w-3 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <a
                      href={`mailto:${displayEmail}`}
                      className="font-medium hover:underline break-all"
                      style={{ color: theme.accent }}
                    >
                      {displayEmail}
                    </a>
                  </div>
                </ProfileRow>
              )}
              {displayPhone && (
                <ProfileRow label="Phone" theme={theme}>
                  <div className="flex items-center gap-1.5">
                    {signal.enriched_phone && (
                      <svg className="h-3 w-3 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <a
                      href={`tel:${displayPhone}`}
                      className="font-medium hover:underline tabular-nums"
                      style={{ color: theme.accent, fontFamily: theme.fontMono }}
                    >
                      {displayPhone}
                    </a>
                  </div>
                </ProfileRow>
              )}
              {(company || title) && (
                <ProfileRow label="Role" theme={theme}>
                  <span className="font-medium" style={{ color: 'var(--t-fg-85)' }}>
                    {[title, company].filter(Boolean).join(' · ')}
                  </span>
                </ProfileRow>
              )}
              {linkedin && (
                <ProfileRow label="LinkedIn" theme={theme}>
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline break-all"
                    style={{ color: theme.accent }}
                  >
                    {linkedin.replace(/^https?:\/\//, '')}
                  </a>
                </ProfileRow>
              )}
              {CRMId && (
                <ProfileRow label="CRM" theme={theme}>
                  <span className="text-xs" style={{ color: 'var(--t-fg-70)', fontFamily: theme.fontMono }}>
                    {CRMId}
                  </span>
                </ProfileRow>
              )}
            </dl>
          </Card>
        )}

        {/* Raw content */}
        <Card title="Raw content" ord="06">
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--t-fg-04)', border: '1px solid var(--a-border)' }}
          >
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: 'var(--t-fg-70)' }}>
              {signal.content}
            </p>
          </div>
          {signal.url && (
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm hover:underline"
              style={{ color: theme.accent }}
            >
              View original
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
              </svg>
            </a>
          )}
        </Card>
      </section>

      {/* ── AI Classification ── */}
      {signal.processed && (
        <section className="space-y-4">
          <SectionTitle ord="07" title="AI classification" subtitle="AI score for intent, urgency, and routing blockers" theme={theme} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <Card title="Summary" ord="" mute>
              <p className="leading-relaxed" style={{ color: 'var(--t-fg-70)' }}>{signal.summary || '—'}</p>
            </Card>

            <Card title="Urgency score" ord="" mute>
              <UrgencyDial score={signal.urgency_score} theme={theme} />
            </Card>

            <Card title="Intent category" ord="" mute>
              <div className="flex items-center gap-3">
                {signal.intent_level && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: signal.intent_level === 'HIGH_INTENT' ? '#EB4203'
                        : signal.intent_level === 'MEDIUM_INTENT' ? '#FF9C5F' : '#00CEC8',
                    }}
                  />
                )}
                <p className="text-xl font-semibold tracking-tight" style={{ color: 'var(--t-fg-95)' }}>
                  {signal.intent_category || '—'}
                </p>
              </div>
            </Card>

            <Card title="Pain points" ord="" mute>
              {signal.pain_points?.length ? (
                <div className="flex flex-wrap gap-2">
                  {signal.pain_points.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        background: 'rgba(0,206,200,0.10)',
                        border: '1px solid rgba(0,206,200,0.22)',
                        color: 'rgba(0,206,200,0.90)',
                      }}
                    >
                      <span className="h-1 w-1 rounded-full" style={{ background: '#00CEC8' }} />
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--t-fg-45)' }}>No pain points extracted.</p>
              )}
            </Card>
          </div>
        </section>
      )}

      {/* ── Dedup hash ── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{
          background: 'var(--t-fg-02)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-sm)',
        }}
      >
        <span className="shrink-0 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>
          Dedup hash
        </span>
        <span className="break-all text-right text-xs" style={{ color: 'var(--t-fg-55)', fontFamily: theme.fontMono }}>
          {signal.content_hash}
        </span>
      </div>
    </div>
  );
}

// ── SignalTimeline ─────────────────────────────────────────────────────────────

function SignalTimeline({ signal, theme }: { signal: Signal; theme: ReturnType<typeof useWorkspaceTheme> }) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const steps = [
    { label: 'Collected',  date: fmt(signal.created_at),   done: true                  },
    { label: 'Classified', date: signal.classified_at ? fmt(signal.classified_at) : 'Pending', done: !!signal.classified_at },
    { label: 'Enriched',   date: signal.enriched_at ? fmt(signal.enriched_at) : 'Pending',    done: !!signal.enriched_at   },
  ];

  return (
    <div
      className="flex items-start px-6 py-5"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
      }}
    >
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center">
          <div className="flex flex-1 flex-col items-center gap-2.5">
            {/* Step circle */}
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: step.done ? `${theme.accent}20` : 'var(--t-fg-05)',
                border: `1.5px solid ${step.done ? theme.accent : 'var(--t-fg-12)'}`,
              }}
            >
              {step.done ? (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--t-fg-20)' }} />
              )}
            </div>

            {/* Label + date */}
            <div className="text-center">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.22em]"
                style={{ fontFamily: theme.fontMono, color: step.done ? 'var(--t-fg-55)' : 'var(--t-fg-25)' }}
              >
                {step.label}
              </p>
              <p
                className="mt-0.5 text-[10px] tabular-nums"
                style={{ fontFamily: theme.fontMono, color: step.done ? 'var(--t-fg-40)' : 'var(--t-fg-20)' }}
              >
                {step.date}
              </p>
            </div>
          </div>

          {/* Connector */}
          {i < steps.length - 1 && (
            <div
              className="mx-2 h-px flex-1 -translate-y-4"
              style={{ background: steps[i + 1].done ? `${theme.accent}40` : 'var(--a-border)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────────

function Card({ children, title, ord, right, mute }: {
  children: React.ReactNode;
  title: string;
  ord: string;
  right?: React.ReactNode;
  mute?: boolean;
}) {
  return (
    <div
      className="p-5"
      style={{
        background: mute ? 'var(--t-fg-02)' : 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          {ord && (
            <span className="text-[9px] tabular-nums tracking-[0.2em]" style={{ color: 'var(--t-fg-35)', fontFamily: "'JetBrains Mono', monospace" }}>
              {ord}
            </span>
          )}
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-55)', fontFamily: "'JetBrains Mono', monospace" }}>
            {title}
          </p>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ProfileRow({ label, children, theme }: { label: string; children: React.ReactNode; theme: ReturnType<typeof useWorkspaceTheme> }) {
  return (
    <div className="grid grid-cols-[80px,1fr] items-baseline gap-3">
      <dt className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}>
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function SectionTitle({ ord, title, subtitle, theme }: { ord: string; title: string; subtitle: string; theme: ReturnType<typeof useWorkspaceTheme> }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[10px] tabular-nums tracking-[0.3em]" style={{ color: 'var(--t-fg-35)', fontFamily: theme.fontMono }}>{ord}</span>
      <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
      <div>
        <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--t-fg-95)' }}>{title}</h2>
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--t-fg-45)' }}>{subtitle}</p>
      </div>
    </div>
  );
}

function IntentBadge({ level, theme }: { level: string | null; theme: ReturnType<typeof useWorkspaceTheme> }) {
  if (!level) return <ToneBadge tone="blue" theme={theme}>Unclassified</ToneBadge>;
  const tone: 'red' | 'gold' | 'blue' =
    level === 'HIGH_INTENT' ? 'red' : level === 'MEDIUM_INTENT' ? 'gold' : 'blue';
  return <ToneBadge tone={tone} theme={theme}>{level.replace('_INTENT', '').toLowerCase()} intent</ToneBadge>;
}

function ToneBadge({ children, tone, theme, title }: {
  children: React.ReactNode;
  tone: 'accent' | 'green' | 'gold' | 'blue' | 'red';
  theme: ReturnType<typeof useWorkspaceTheme>;
  title?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    accent: { bg: 'var(--t-accent-soft)', fg: theme.accent },
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

// SVG arc gauge — track uses style prop so CSS vars resolve correctly in light + dark
function UrgencyDial({ score, theme }: { score: number | null; theme: ReturnType<typeof useWorkspaceTheme> }) {
  if (score == null) return <p className="text-sm" style={{ color: 'var(--t-fg-45)' }}>—</p>;

  const color = score >= 70 ? theme.intent.high : score >= 40 ? theme.intent.medium : theme.intent.low;
  const label = score >= 70 ? 'Hot · act now' : score >= 40 ? 'Warm · this week' : 'Cool · low priority';

  // 270° sweep arc using stroke-dasharray, starting at bottom-left (-225°)
  const r = 40;
  const size = 104;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const gaugeLen = circ * 0.75;
  const fillLen = (score / 100) * gaugeLen;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative inline-flex">
        <svg width={size} height={size}>
          {/* Background track — CSS var via style prop */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            style={{ stroke: 'var(--t-fg-10)' }}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${gaugeLen} ${circ - gaugeLen}`}
            transform={`rotate(-225 ${cx} ${cy})`}
          />
          {/* Score fill */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${fillLen} ${circ - fillLen}`}
            transform={`rotate(-225 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.7s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums leading-none" style={{ color, fontFamily: theme.fontMono }}>
            {score}
          </span>
          <span className="mt-0.5 text-[9px]" style={{ color: 'var(--t-fg-45)' }}>/ 100</span>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--t-fg-45)', fontFamily: theme.fontMono }}>
        {label}
      </p>
    </div>
  );
}
