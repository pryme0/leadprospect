'use client';

import { ReactNode } from 'react';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface StatTileProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatTile({ label, value, color }: StatTileProps) {
  const theme = useWorkspaceTheme();
  const tileColor = color || theme.accent;
  return (
    <div
      className="flex min-w-[88px] flex-col gap-1.5 rounded-xl px-4 py-3"
      style={{
        background: 'var(--t-fg-05)',
        border: `1px solid ${tileColor}30`,
      }}
    >
      <p
        className="text-[8px] font-bold uppercase tracking-[0.28em]"
        style={{ color: tileColor, fontFamily: theme.fontMono }}
      >
        {label}
      </p>
      <p
        className="text-xl font-black tabular-nums"
        style={{ color: 'var(--t-fg-95)', fontFamily: theme.fontMono }}
      >
        {value}
      </p>
    </div>
  );
}

interface PageHeaderProps {
  label: string;
  title: string;
  description?: string;
  stats?: StatTileProps[];
  actions?: ReactNode;
  showDot?: boolean;
}

export default function PageHeader({
  label,
  title,
  description,
  stats,
  actions,
  showDot = false,
}: PageHeaderProps) {
  const theme = useWorkspaceTheme();

  return (
    <header
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr),auto]"
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-border)',
        borderRadius: 'var(--t-radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--t-card-shadow)',
      }}
    >
      <div>
        <p
          className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em]"
          style={{ color: theme.accent, fontFamily: theme.fontMono }}
        >
          {showDot && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: theme.accent }}
            />
          )}
          {label}
        </p>
        <h1
          className="text-[26px] font-black leading-tight tracking-tight"
          style={{ color: 'var(--t-fg-95)' }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="mt-1.5 max-w-xl text-sm leading-relaxed"
            style={{ color: 'var(--t-fg-60)' }}
          >
            {description}
          </p>
        )}
        {actions && <div className="mt-3">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {stats.map((stat) => (
            <StatTile key={stat.label} {...stat} />
          ))}
        </div>
      )}
    </header>
  );
}

export { StatTile };
export type { PageHeaderProps, StatTileProps };
