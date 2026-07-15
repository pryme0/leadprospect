import type { HubInsight } from '@/lib/hub/insights';

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok', linkedin: 'LinkedIn', instagram: 'Instagram', threads: 'Threads', reddit: 'Reddit', twitter: 'X',
};
function platformLabel(p: string): string {
  return PLATFORM_LABELS[p.toLowerCase()] ?? (p.charAt(0).toUpperCase() + p.slice(1));
}

/**
 * The USP block: aggregated, anonymized interest insight. Renders nothing
 * when the insight is suppressed (k-anonymity), so callers can drop it in
 * unconditionally.
 */
export default function DemandInsight({ insight, title, subtitle }: { insight: HubInsight; title: string; subtitle: string }) {
  if (!insight.available) return null;
  return (
    <section className="glass-card rounded-2xl p-8 border border-primary/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-tertiary text-[20px]">insights</span>
        <h2 className="font-headline-md text-on-surface">{title}</h2>
      </div>
      <p className="text-mono-label text-on-surface-variant mb-6">{subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-container rounded-xl p-4 border border-glass-stroke">
          <p className="text-display-lg text-primary leading-none">{insight.demandBand.split(' ')[0]}</p>
          <p className="text-mono-label text-on-surface-variant mt-1">people looking to buy</p>
        </div>
        {insight.wowTrendPct !== null && (
          <div className="bg-surface-container rounded-xl p-4 border border-glass-stroke">
            <p className={`text-display-lg leading-none ${insight.wowTrendPct >= 0 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
              {insight.wowTrendPct >= 0 ? '+' : ''}{insight.wowTrendPct}%
            </p>
            <p className="text-mono-label text-on-surface-variant mt-1">change this week</p>
          </div>
        )}
        {insight.businesses !== undefined && (
          <div className="bg-surface-container rounded-xl p-4 border border-glass-stroke">
            <p className="text-display-lg text-on-surface leading-none">{insight.businesses}</p>
            <p className="text-mono-label text-on-surface-variant mt-1">businesses</p>
          </div>
        )}
      </div>

      {insight.painPoints.length > 0 && (
        <div className="mb-6">
          <p className="text-mono-label text-on-surface-variant mb-3">What people are asking for</p>
          <ul className="flex flex-col gap-2.5">
            {insight.painPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-body-md text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">bolt</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.platforms.length > 0 && (
        <div>
          <p className="text-mono-label text-on-surface-variant mb-3">Where people are active</p>
          <div className="flex flex-wrap gap-2">
            {insight.platforms.map((pl) => (
              <span key={pl.platform} className="inline-flex items-center gap-1.5 bg-surface-container rounded-full border border-glass-stroke px-3 py-1 text-mono-label text-on-surface-variant">
                {platformLabel(pl.platform)} · {Math.round(pl.share * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-mono-label text-on-surface-variant/70 mt-6">Based on what people are searching for, gathered by SYNQ.</p>
    </section>
  );
}
