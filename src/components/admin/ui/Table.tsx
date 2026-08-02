'use client';

import React from 'react';

/* ── Accessible table ─────────────────────────────────────────────────────────
 * Real <table> semantics (screen-reader + keyboard friendly) with comfortable
 * row height and readable text — replaces the dense CSS-grid "rows" the admin
 * used to fake tables with. Wrapped in a horizontal-scroll container so wide
 * tables never blow out the page on mobile.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export function Table<T>({
  columns,
  rows,
  keyOf,
  onRowClick,
  empty,
  className = '',
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div
      className={['w-full overflow-x-auto rounded-2xl border', className].join(' ')}
      style={{ borderColor: 'var(--a-border)' }}
    >
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr style={{ background: 'var(--a-card2)' }}>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width, textAlign: c.align || 'left', color: 'var(--a-text-50)', borderColor: 'var(--a-border)' }}
                className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide border-b whitespace-nowrap"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={keyOf(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                'transition-colors',
                onRowClick ? 'cursor-pointer' : '',
              ].join(' ')}
              style={{ color: 'var(--a-text-80)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--a-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{ textAlign: c.align || 'left', borderColor: 'var(--a-border)' }}
                  className="px-4 py-3.5 border-b align-middle"
                >
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
