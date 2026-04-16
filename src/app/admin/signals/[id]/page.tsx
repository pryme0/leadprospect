'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

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
  // Enrichment fields (Apollo / Hunter)
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

function IntentBadge({ level }: { level: string | null }) {
  if (!level) return <span className="badge-blue">Unclassified</span>;
  const cls =
    level === 'HIGH_INTENT' ? 'badge-red' :
    level === 'MEDIUM_INTENT' ? 'badge-yellow' : 'badge-blue';
  return <span className={cls}>{level.replace(/_/g, ' ')}</span>;
}

function UrgencyBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-brand-muted">—</span>;
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-yellow-400' : 'bg-[#0BAAEF]';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-brand-slate rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-mono font-bold text-sm ${score >= 70 ? 'text-red-400' : score >= 40 ? 'text-yellow-400' : 'text-[#0BAAEF]'}`}>
        {score}/100
      </span>
    </div>
  );
}

export default function SignalDetailPage() {
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
        <span className="loading-spinner w-8 h-8 border-[#0BAAEF]" />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="text-center py-32">
        <p className="text-brand-muted mb-4">{error || 'Signal not found.'}</p>
        <button onClick={() => router.back()} className="btn-secondary">← Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-brand-muted hover:text-white text-sm flex items-center gap-1 mb-3 transition-colors"
          >
            ← Back to Signals
          </button>
          <h1 className="text-2xl font-bold text-white">
            {signal.name || signal.enriched_name || 'LinkedIn User'}
          </h1>
          {signal.username && !/^ACoAA/i.test(signal.username) && (
            <p className="text-brand-muted text-xs mt-1 font-mono truncate max-w-xl" title={signal.username}>
              @{signal.username}
            </p>
          )}
          <p className="text-brand-muted text-[10px] font-mono mt-1 opacity-60">{signal.id}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <IntentBadge level={signal.intent_level} />
          {!signal.processed && (
            <button
              onClick={handleClassify}
              disabled={classifying}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {classifying ? 'Classifying…' : 'Classify Now'}
            </button>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Source', value: signal.source.charAt(0).toUpperCase() + signal.source.slice(1) },
          { label: 'Author', value: signal.name || (signal.username && !/^ACoAA/i.test(signal.username) ? `@${signal.username}` : 'LinkedIn User') },
          { label: 'Status', value: signal.processed ? 'Processed' : 'Pending' },
          { label: 'Collected', value: new Date(signal.created_at).toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-brand-slate rounded-xl p-4">
            <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white font-medium text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Lead Profile — merges scraped + enriched contact data.
          Enriched values (Apollo/Hunter) take precedence over scraped. */}
      {(() => {
        const displayName = signal.enriched_name || signal.name;
        const displayEmail = signal.enriched_email || signal.email;
        const displayPhone = signal.enriched_phone || signal.phone;
        const company = signal.enriched_company;
        const title = signal.enriched_title;
        const linkedin = signal.enriched_linkedin_url;
        const enrichedVia = signal.enriched_via;
        const ghlId = signal.ghl_contact_id;
        const isEnriched =
          enrichedVia && enrichedVia !== 'none' && enrichedVia !== null;

        if (
          !displayName && !displayEmail && !displayPhone &&
          !company && !title && !linkedin
        ) return null;

        return (
          <div className="bg-brand-slate rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-brand-muted text-xs uppercase tracking-wider">
                Lead Profile
              </p>
              {isEnriched && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold uppercase"
                  title={`Enriched via ${enrichedVia}`}
                >
                  ✓ Enriched ({enrichedVia})
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayName && (
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider">Name</p>
                  <p className="text-white font-medium">{displayName}</p>
                </div>
              )}
              {displayEmail && (
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider">Email</p>
                  <a
                    href={`mailto:${displayEmail}`}
                    className="text-[#0BAAEF] font-medium hover:underline break-all"
                  >
                    {displayEmail}
                  </a>
                </div>
              )}
              {displayPhone && (
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider">Phone</p>
                  <a
                    href={`tel:${displayPhone}`}
                    className="text-[#0BAAEF] font-medium hover:underline"
                  >
                    {displayPhone}
                  </a>
                </div>
              )}
              {(company || title) && (
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider">Company / Title</p>
                  <p className="text-white font-medium">
                    {[title, company].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
              {linkedin && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider">LinkedIn</p>
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0BAAEF] font-medium hover:underline break-all"
                  >
                    {linkedin}
                  </a>
                </div>
              )}
              {ghlId && (
                <div className="sm:col-span-2 pt-2 border-t border-brand-navy/40">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-semibold uppercase mr-2">
                    GHL
                  </span>
                  <span className="text-brand-muted text-xs">
                    Contact ID:&nbsp;
                    <span className="font-mono text-brand-light">{ghlId}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Content */}
      <div className="bg-brand-slate rounded-xl p-5">
        <p className="text-brand-muted text-xs uppercase tracking-wider mb-3">Raw Content</p>
        <p className="text-brand-light leading-relaxed whitespace-pre-wrap">{signal.content}</p>
        {signal.url && (
          <a
            href={signal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-[#0BAAEF] text-sm hover:underline"
          >
            View original source ↗
          </a>
        )}
      </div>

      {/* Classification results */}
      {signal.processed && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">AI Classification</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Summary */}
            <div className="bg-brand-slate rounded-xl p-5 sm:col-span-2">
              <p className="text-brand-muted text-xs uppercase tracking-wider mb-2">Summary</p>
              <p className="text-white leading-relaxed">{signal.summary || '—'}</p>
            </div>

            {/* Intent category */}
            <div className="bg-brand-slate rounded-xl p-5">
              <p className="text-brand-muted text-xs uppercase tracking-wider mb-2">Intent Category</p>
              <p className="text-white font-medium">{signal.intent_category || '—'}</p>
            </div>

            {/* Urgency */}
            <div className="bg-brand-slate rounded-xl p-5">
              <p className="text-brand-muted text-xs uppercase tracking-wider mb-3">Urgency Score</p>
              <UrgencyBar score={signal.urgency_score} />
            </div>

            {/* Pain points */}
            <div className="bg-brand-slate rounded-xl p-5 sm:col-span-2">
              <p className="text-brand-muted text-xs uppercase tracking-wider mb-3">Pain Points</p>
              {signal.pain_points?.length ? (
                <div className="flex flex-wrap gap-2">
                  {signal.pain_points.map((p, i) => (
                    <span key={i} className="px-3 py-1 bg-brand-dark rounded-full text-sm text-brand-light border border-white/10">
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-brand-muted">No pain points extracted.</p>
              )}
            </div>

            {/* Classified at */}
            {signal.classified_at && (
              <div className="bg-brand-slate rounded-xl p-5 sm:col-span-2">
                <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">Classified At</p>
                <p className="text-brand-light text-sm">{new Date(signal.classified_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content hash */}
      <div className="bg-brand-slate/50 rounded-xl p-4">
        <p className="text-brand-muted text-xs uppercase tracking-wider mb-1">Content Hash (deduplication)</p>
        <p className="font-mono text-xs text-brand-muted break-all">{signal.content_hash}</p>
      </div>
    </div>
  );
}
