'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* ── Card ─────────────────────────────────────────────────────────────────────
 * Clean white (or dark) panel with real elevation. The base container for
 * everything on a page. No nested cards — flatten instead.
 * ──────────────────────────────────────────────────────────────────────────── */
export function Card({
  className = '',
  style,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', boxShadow: 'var(--a-card-shadow)', ...style }}
      className={['rounded-2xl border', className].join(' ')}
    >
      {children}
    </div>
  );
}

/* ── SectionCard ──────────────────────────────────────────────────────────────
 * A card with a titled header row (icon + title + optional subtitle + action).
 * ──────────────────────────────────────────────────────────────────────────── */
export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  bodyClassName = 'p-5',
  className = '',
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--a-border)' }}>
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <span
              className="grid place-items-center h-9 w-9 rounded-xl shrink-0"
              style={{ background: 'var(--t-accent-soft, rgba(109,94,249,0.12))', color: 'var(--t-accent, #6D5EF9)' }}
            >
              <Icon size={18} strokeWidth={2} aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight" style={{ color: 'var(--a-text)' }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] mt-0.5 leading-snug" style={{ color: 'var(--a-text-50)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────────────────
 * The big-number tile. Plain label on top, large tabular number, optional
 * trend chip and helper line. Replaces the per-page inline KpiCard copies.
 * ──────────────────────────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  accent = 'var(--t-accent, #6D5EF9)',
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  trend?: { value: number; goodWhenUp?: boolean };
  accent?: string;
  onClick?: () => void;
}) {
  const up = trend ? trend.value >= 0 : false;
  const good = trend ? (trend.goodWhenUp === false ? !up : up) : true;
  const trendColor = good ? 'var(--t-green, #16a34a)' : 'var(--t-coral, #FF5C74)';

  return (
    <Card
      onClick={onClick}
      className={['p-5 transition-transform duration-150', onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium" style={{ color: 'var(--a-text-50)' }}>
          {label}
        </span>
        {Icon && (
          <span className="grid place-items-center h-8 w-8 rounded-lg" style={{ background: 'var(--a-card2)', color: accent }}>
            <Icon size={16} strokeWidth={2} aria-hidden />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2.5">
        <span className="text-[30px] leading-none font-bold tabular-nums tracking-tight" style={{ color: 'var(--a-text)' }}>
          {value}
        </span>
        {trend && (
          <span
            className="mb-0.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums"
            style={{ color: trendColor, background: `color-mix(in srgb, ${trendColor} 12%, transparent)` }}
          >
            {up ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: 'var(--a-text-50)' }}>
          {hint}
        </p>
      )}
    </Card>
  );
}
