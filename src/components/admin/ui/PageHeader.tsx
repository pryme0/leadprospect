'use client';

import React from 'react';

/* ── PageHeader ───────────────────────────────────────────────────────────────
 * Top of every page: a plain, friendly title + one-line description, with room
 * for a single primary action on the right. Follows the brief's rule —
 * "key insight → primary action" — by keeping the title human and the action
 * obvious and singular.
 * ──────────────────────────────────────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={['flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6', className].join(' ')}>
      <div className="min-w-0">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-tight" style={{ color: 'var(--a-text)' }}>
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[14px] sm:text-[15px] leading-relaxed" style={{ color: 'var(--a-text-50)' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
