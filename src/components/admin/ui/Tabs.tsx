'use client';

import React from 'react';

/* ── Tabs ─────────────────────────────────────────────────────────────────────
 * Simple segmented tabs. Used to fold the old Signals / Browse / Ops pages into
 * one "Buyer Activity" screen so there's a single obvious place to look.
 * ──────────────────────────────────────────────────────────────────────────── */
export function Tabs({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={['inline-flex items-center gap-1 rounded-xl p-1 border', className].join(' ')}
      style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 h-9 text-[13.5px] font-semibold cursor-pointer transition-colors"
            style={
              on
                ? { background: 'var(--a-card)', color: 'var(--a-text)', boxShadow: 'var(--a-card-shadow)' }
                : { background: 'transparent', color: 'var(--a-text-50)' }
            }
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className="tabular-nums rounded-full px-1.5 text-[11px] font-bold"
                style={{
                  background: on ? 'var(--t-accent-soft, rgba(109,94,249,0.14))' : 'var(--a-hover2)',
                  color: on ? 'var(--t-accent, #6D5EF9)' : 'var(--a-text-50)',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
