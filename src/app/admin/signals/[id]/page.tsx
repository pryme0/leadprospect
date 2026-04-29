'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useTenantTheme } from '@/lib/tenant-theme';

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
  const theme = useTenantTheme();
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
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--t-fg-06)', borderTopColor: theme.accent }}
        />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="max-w-md mx-auto py-32 text-center space-y-4">
        <div className="h-px w-12 bg-white/10 mx-auto" />
        <p className="text-white/55">{error || 'Signal not found.'}</p>
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

  const displayName = signal.enriched_name || signal.name || (signal.username && !/^ACoAA/i.test(signal.username) ? `@${signal.username}` : 'LinkedIn user');
  const displayEmail = signal.enriched_email || signal.email;
  const displayPhone = signal.enriched_phone || signal.phone;
  const company = signal.enriched_company;
  const title = signal.enriched_title;
  const linkedin = signal.enriched_linkedin_url;
  const enrichedVia = signal.enriched_via;
  const ghlId = signal.ghl_contact_id;
  const isEnriched = enrichedVia && enrichedVia !== 'none' && enrichedVia !== null;
  const sourceColor = theme.platform[signal.source] || theme.chart[3];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back link + breadcrumb */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/45 hover:text-white transition-colors"
        style={{ fontFamily: theme.fontMono }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to signals
      </button>

      {/* Hero */}
      <header className="grid lg:grid-cols-[1fr,auto] gap-6 items-end pb-8 border-b" style={{ borderColor: 'var(--a-border)' }}>
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span
              className="inline-flex items-center gap-2 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] font-semibold capitalize"
              style={{
                background: 'var(--t-fg-04)',
                border: '1px solid var(--a-border2)',
                borderRadius: 'var(--t-radius-sm)',
                fontFamily: theme.fontMono,
                color: 'var(--t-fg-70)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: sourceColor, boxShadow: `0 0 8px ${sourceColor}80` }} />
              {signal.source}
            </span>
            <IntentBadge level={signal.intent_level} theme={theme} />
            {signal.processed
              ? <ToneBadge tone="green" theme={theme}>Processed</ToneBadge>
              : <ToneBadge tone="gold" theme={theme}>Pending</ToneBadge>}
          </div>
          <h1 className="text-white font-bold text-3xl sm:text-4xl tracking-tight leading-[1.05]">
            {displayName}
          </h1>
          {signal.username && !/^ACoAA/i.test(signal.username) && (
            <p
              className="text-white/45 text-xs mt-2 truncate"
              style={{ fontFamily: theme.fontMono }}
              title={signal.username}
            >
              @{signal.username}
            </p>
          )}
          <p
            className="text-white/25 text-[10px] mt-2 tracking-[0.15em]"
            style={{ fontFamily: theme.fontMono }}
          >
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
                <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Classifying…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Classify with Claude
              </>
            )}
          </button>
        )}
      </header>

      {/* Meta strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4">
        {[
          { ord: '01', label: 'Source', value: signal.source.charAt(0).toUpperCase() + signal.source.slice(1) },
          { ord: '02', label: 'Status', value: signal.processed ? 'Processed' : 'Pending' },
          { ord: '03', label: 'Collected', value: new Date(signal.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' }) },
          { ord: '04', label: 'Classified', value: signal.classified_at ? new Date(signal.classified_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—' },
        ].map((m, i, arr) => (
          <div
            key={m.ord}
            className="px-5 py-4"
            style={{
              borderRight: i < arr.length - 1 ? '1px solid var(--a-border)' : 'none',
              borderTop: '1px solid var(--a-border)',
              borderBottom: '1px solid var(--a-border)',
              borderLeft: i === 0 ? '1px solid var(--a-border)' : 'none',
              borderRadius: i === 0 ? 'var(--t-radius) 0 0 var(--t-radius)' : i === arr.length - 1 ? '0 var(--t-radius) var(--t-radius) 0' : '0',
              background: 'var(--a-card)',
            }}
          >
            <span
              className="text-[9px] tabular-nums tracking-[0.2em] text-white/30"
              style={{ fontFamily: theme.fontMono }}
            >
              {m.ord}
            </span>
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-white/45 mt-1"
              style={{ fontFamily: theme.fontMono }}
            >
              {m.label}
            </p>
            <p className="text-white text-sm font-medium mt-0.5 truncate">{m.value}</p>
          </div>
        ))}
      </section>

      {/* Two-column: lead profile (left) + content (right) */}
      <section className="grid lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)] gap-6">
        {/* Lead profile */}
        {(displayEmail || displayPhone || company || title || linkedin) && (
          <Card title="Lead profile" ord="05" right={
            isEnriched ? (
              <ToneBadge tone="green" theme={theme} title={`Enriched via ${enrichedVia}`}>
                ✓ Enriched · {enrichedVia}
              </ToneBadge>
            ) : null
          }>
            <dl className="space-y-4">
              {displayEmail && (
                <ProfileRow label="Email" theme={theme}>
                  <a
                    href={`mailto:${displayEmail}`}
                    className="font-medium hover:underline break-all"
                    style={{ color: theme.accent }}
                  >
                    {displayEmail}
                  </a>
                </ProfileRow>
              )}
              {displayPhone && (
                <ProfileRow label="Phone" theme={theme}>
                  <a
                    href={`tel:${displayPhone}`}
                    className="font-medium hover:underline tabular-nums"
                    style={{ color: theme.accent, fontFamily: theme.fontMono }}
                  >
                    {displayPhone}
                  </a>
                </ProfileRow>
              )}
              {(company || title) && (
                <ProfileRow label="Role" theme={theme}>
                  <span className="text-white font-medium">
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
              {ghlId && (
                <ProfileRow label="GHL contact" theme={theme}>
                  <span
                    className="text-white/85 text-xs"
                    style={{ fontFamily: theme.fontMono }}
                  >
                    {ghlId}
                  </span>
                </ProfileRow>
              )}
            </dl>
          </Card>
        )}

        {/* Raw content */}
        <Card title="Raw content" ord="06">
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-[15px]">
            {signal.content}
          </p>
          {signal.url && (
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-5 text-sm hover:underline"
              style={{ color: theme.accent }}
            >
              View original
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M14 4h6v6M10 14L20 4M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
              </svg>
            </a>
          )}
        </Card>
      </section>

      {/* Classification results */}
      {signal.processed && (
        <section className="space-y-4">
          <SectionTitle ord="07" title="AI classification" subtitle="Claude's read of intent, urgency, and pain" theme={theme} />

          <div className="grid lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-4">
            {/* Summary */}
            <Card title="Summary" ord="" mute>
              <p className="text-white/80 leading-relaxed">{signal.summary || '—'}</p>
            </Card>

            {/* Urgency */}
            <Card title="Urgency score" ord="" mute>
              <UrgencyDial score={signal.urgency_score} theme={theme} />
            </Card>

            {/* Intent category */}
            <Card title="Intent category" ord="" mute>
              <p className="text-white text-xl font-semibold tracking-tight">
                {signal.intent_category || '—'}
              </p>
            </Card>

            {/* Pain points */}
            <Card title="Pain points" ord="" mute>
              {signal.pain_points?.length ? (
                <div className="flex flex-wrap gap-2">
                  {signal.pain_points.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-3 py-1 text-xs"
                      style={{
                        background: 'var(--t-fg-03)',
                        border: '1px solid var(--a-border2)',
                        color: 'var(--t-fg-85)',
                        borderRadius: '999px',
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white/35">No pain points extracted.</p>
              )}
            </Card>
          </div>
        </section>
      )}

      {/* Hash */}
      <div
        className="px-4 py-3 text-xs flex items-center justify-between gap-3"
        style={{
          background: 'var(--t-fg-02)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-sm)',
        }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.22em] text-white/35 shrink-0"
          style={{ fontFamily: theme.fontMono }}
        >
          Dedup hash
        </span>
        <span
          className="text-white/55 break-all text-right"
          style={{ fontFamily: theme.fontMono }}
        >
          {signal.content_hash}
        </span>
      </div>
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function Card({
  children, title, ord, right, mute,
}: {
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          {ord && (
            <span
              className="text-[9px] tabular-nums tracking-[0.2em] text-white/30"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {ord}
            </span>
          )}
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold text-white/55"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {title}
          </p>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ProfileRow({
  label, children, theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <div className="grid grid-cols-[80px,1fr] gap-3 items-baseline">
      <dt
        className="text-[10px] uppercase tracking-[0.22em] text-white/40"
        style={{ fontFamily: theme.fontMono }}
      >
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function SectionTitle({
  ord, title, subtitle, theme,
}: {
  ord: string;
  title: string;
  subtitle: string;
  theme: ReturnType<typeof useTenantTheme>;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="text-[10px] tracking-[0.3em] text-white/35 tabular-nums"
        style={{ fontFamily: theme.fontMono }}
      >
        {ord}
      </span>
      <span className="block h-px w-6" style={{ background: 'var(--t-accent-soft)' }} />
      <div>
        <h2 className="text-white font-semibold text-sm tracking-tight">{title}</h2>
        <p className="text-white/35 text-[11px] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function IntentBadge({ level, theme }: { level: string | null; theme: ReturnType<typeof useTenantTheme> }) {
  if (!level) return <ToneBadge tone="blue" theme={theme}>Unclassified</ToneBadge>;
  const tone: 'red' | 'gold' | 'blue' =
    level === 'HIGH_INTENT' ? 'red' : level === 'MEDIUM_INTENT' ? 'gold' : 'blue';
  return <ToneBadge tone={tone} theme={theme}>{level.replace('_INTENT', '').toLowerCase()} intent</ToneBadge>;
}

function ToneBadge({
  children, tone, theme, title,
}: {
  children: React.ReactNode;
  tone: 'accent' | 'green' | 'gold' | 'blue' | 'red';
  theme: ReturnType<typeof useTenantTheme>;
  title?: string;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    accent: { bg: 'var(--t-accent-soft)', fg: theme.accent },
    green:  { bg: 'rgba(16,185,129,0.12)', fg: '#34d399' },
    gold:   { bg: 'rgba(212,163,115,0.12)', fg: '#d4a373' },
    blue:   { bg: 'rgba(99,102,241,0.12)', fg: '#a5b4fc' },
    red:    { bg: 'rgba(239,68,68,0.12)',  fg: '#f87171' },
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

function UrgencyDial({ score, theme }: { score: number | null; theme: ReturnType<typeof useTenantTheme> }) {
  if (score == null) return <p className="text-white/35">—</p>;
  const color = score >= 70 ? theme.intent.high : score >= 40 ? theme.intent.medium : theme.intent.low;
  const pct = Math.min(100, score);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span
          className="font-bold text-3xl tabular-nums tracking-tight"
          style={{ color, fontFamily: theme.fontMono }}
        >
          {score}
        </span>
        <span className="text-white/30 text-sm font-semibold">/ 100</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-fg-05)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p
        className="text-[10px] uppercase tracking-[0.22em] text-white/40"
        style={{ fontFamily: theme.fontMono }}
      >
        {score >= 70 ? 'Hot · act now' : score >= 40 ? 'Warm · this week' : 'Cool · low priority'}
      </p>
    </div>
  );
}
