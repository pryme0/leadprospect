'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* ── EmptyState ───────────────────────────────────────────────────────────────
 * Teaches the interface instead of saying "nothing here". Friendly icon, a
 * plain-language line, and (optionally) the one action that fills it.
 * ──────────────────────────────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className = '',
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={['flex flex-col items-center justify-center text-center px-6 py-14', className].join(' ')}>
      {Icon && (
        <span
          className="grid place-items-center h-14 w-14 rounded-2xl mb-4"
          style={{ background: 'var(--t-accent-soft, rgba(109,94,249,0.12))', color: 'var(--t-accent, #6D5EF9)' }}
        >
          <Icon size={26} strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <h3 className="text-[16px] font-semibold" style={{ color: 'var(--a-text)' }}>
        {title}
      </h3>
      {message && (
        <p className="mt-1.5 text-[14px] max-w-sm leading-relaxed" style={{ color: 'var(--a-text-50)' }}>
          {message}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
