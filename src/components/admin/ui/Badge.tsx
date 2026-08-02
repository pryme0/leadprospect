'use client';

import React from 'react';
import { intentInfo, type IntentTone } from '@/lib/labels';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONE_COLORS: Record<Tone, string> = {
  neutral: 'var(--a-text-60)',
  accent: 'var(--t-accent, #6D5EF9)',
  success: 'var(--t-green, #16a34a)',
  warning: 'var(--t-amber, #d97706)',
  danger: 'var(--t-coral, #dc2626)',
  info: 'var(--t-cyan, #0ea5e9)',
};

/** Small pill label. Soft-tinted background + a dot so meaning isn't colour-only. */
export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className = '',
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  const c = TONE_COLORS[tone];
  return (
    <span
      className={['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', className].join(' ')}
      style={{ color: c, background: `color-mix(in srgb, ${c} 13%, transparent)` }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} aria-hidden />}
      {children}
    </span>
  );
}

const INTENT_TONE: Record<IntentTone, Tone> = {
  hot: 'danger',
  warm: 'warning',
  cool: 'info',
  unknown: 'neutral',
};

/** Buying-intent badge — turns HIGH_INTENT etc. into a plain Hot / Warm / Cool pill. */
export function IntentBadge({ value, className = '' }: { value: string | null | undefined; className?: string }) {
  const { label, tone } = intentInfo(value);
  return (
    <Badge tone={INTENT_TONE[tone]} dot className={className}>
      {label}
    </Badge>
  );
}
