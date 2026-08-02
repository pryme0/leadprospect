'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[14px] gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
};

const ICON_SIZE: Record<Size, number> = { sm: 15, md: 17, lg: 18 };

/**
 * One button, four intents. Meets the 44px touch target at md/lg, has a clear
 * focus ring, a smooth press, and a built-in loading spinner so callers never
 * hand-roll async states.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconPx = ICON_SIZE[size];

  const styles: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--t-accent, #6D5EF9)', color: '#fff' }
      : variant === 'danger'
      ? { background: 'var(--t-coral, #FF5C74)', color: '#fff' }
      : variant === 'secondary'
      ? { background: 'var(--a-card)', color: 'var(--a-text)', border: '1px solid var(--a-border2)' }
      : { background: 'transparent', color: 'var(--a-text-60)' };

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={styles}
      className={[
        'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none',
        'transition-[filter,background-color,transform,opacity] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-[var(--t-accent,#6D5EF9)] focus-visible:ring-offset-[var(--a-bg)]',
        'active:scale-[0.98]',
        variant === 'primary' || variant === 'danger' ? 'hover:brightness-110 shadow-sm' : 'hover:bg-[var(--a-hover2)]',
        isDisabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer',
        block ? 'w-full' : '',
        SIZES[size],
        className,
      ].join(' ')}
    >
      {loading ? (
        <Spinner px={iconPx} />
      ) : (
        Icon && <Icon size={iconPx} strokeWidth={2} className="shrink-0" aria-hidden />
      )}
      {children && <span>{children}</span>}
      {!loading && IconRight && <IconRight size={iconPx} strokeWidth={2} className="shrink-0" aria-hidden />}
    </button>
  );
}

function Spinner({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none" className="animate-spin shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
