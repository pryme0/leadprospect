'use client';

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

/* ── InsightCard ──────────────────────────────────────────────────────────────
 * The brief's "AI insights" — one plain, conversational sentence instead of a
 * raw number. Tone tints the accent bar so good/attention/warning read at a
 * glance without relying on colour alone (icon carries meaning too).
 * ──────────────────────────────────────────────────────────────────────────── */
export function InsightCard({
  icon: Icon,
  text,
  tone = 'neutral',
  href,
  cta,
}: {
  icon: LucideIcon;
  text: React.ReactNode;
  tone?: 'good' | 'attention' | 'warning' | 'neutral';
  href?: string;
  cta?: string;
}) {
  const color =
    tone === 'good' ? 'var(--t-green, #16a34a)'
    : tone === 'warning' ? 'var(--t-coral, #dc2626)'
    : tone === 'attention' ? 'var(--t-amber, #d97706)'
    : 'var(--t-accent, #6D5EF9)';

  return (
    <Card className="p-4 flex items-start gap-3.5">
      <span
        className="grid place-items-center h-10 w-10 rounded-xl shrink-0 mt-0.5"
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        <Icon size={19} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] leading-relaxed" style={{ color: 'var(--a-text-80)' }}>
          {text}
        </p>
        {href && cta && (
          <Link
            href={href}
            className="inline-block mt-1.5 text-[13.5px] font-semibold cursor-pointer hover:underline"
            style={{ color }}
          >
            {cta} →
          </Link>
        )}
      </div>
    </Card>
  );
}

/* ── QuickAction ──────────────────────────────────────────────────────────────
 * Large, immediately-visible action tile. "Never wonder where to click."
 * ──────────────────────────────────────────────────────────────────────────── */
export function QuickAction({
  icon: Icon,
  label,
  hint,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className="grid place-items-center h-11 w-11 rounded-xl shrink-0"
        style={{ background: 'var(--t-accent-soft, rgba(109,94,249,0.12))', color: 'var(--t-accent, #6D5EF9)' }}
      >
        <Icon size={20} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-[14.5px] font-semibold leading-tight" style={{ color: 'var(--a-text)' }}>
          {label}
        </div>
        {hint && (
          <div className="text-[12.5px] mt-0.5 leading-snug" style={{ color: 'var(--a-text-50)' }}>
            {hint}
          </div>
        )}
      </div>
    </>
  );

  const cls =
    'flex items-center gap-3.5 p-4 rounded-2xl border transition-all duration-150 cursor-pointer hover:-translate-y-0.5 w-full text-left';
  const style: React.CSSProperties = {
    background: 'var(--a-card)',
    borderColor: 'var(--a-border)',
    boxShadow: 'var(--a-card-shadow)',
  };

  return href ? (
    <Link href={href} className={cls} style={style}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls} style={style}>
      {inner}
    </button>
  );
}

/* ── ActivityRow ──────────────────────────────────────────────────────────────
 * Human-readable timeline line — "3 new hot leads from TikTok", not an ID dump.
 * ──────────────────────────────────────────────────────────────────────────── */
export function ActivityRow({
  icon: Icon,
  text,
  time,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  text: React.ReactNode;
  time?: string;
  tone?: 'good' | 'attention' | 'warning' | 'neutral';
}) {
  const color =
    tone === 'good' ? 'var(--t-green, #16a34a)'
    : tone === 'warning' ? 'var(--t-coral, #dc2626)'
    : tone === 'attention' ? 'var(--t-amber, #d97706)'
    : 'var(--a-text-50)';

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className="grid place-items-center h-8 w-8 rounded-lg shrink-0"
        style={{ background: 'var(--a-card2)', color }}
      >
        <Icon size={15} strokeWidth={2} aria-hidden />
      </span>
      <p className="flex-1 min-w-0 text-[14px] leading-snug" style={{ color: 'var(--a-text-80)' }}>
        {text}
      </p>
      {time && (
        <span className="text-[12.5px] tabular-nums shrink-0" style={{ color: 'var(--a-text-40)' }}>
          {time}
        </span>
      )}
    </div>
  );
}

/** Time-of-day greeting — "Good morning". Pass the local hour (0–23). */
export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
