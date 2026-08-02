'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/* ── Modal ────────────────────────────────────────────────────────────────────
 * A calm centered dialog. Strong scrim, Escape to close, click-outside to
 * dismiss, and a clear close affordance. Kept generic so pages stop hand-rolling
 * one-off overlays.
 * ──────────────────────────────────────────────────────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 animate-[fadeIn_150ms_ease-out]"
        style={{ background: 'rgba(8,12,24,0.55)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div
        className={['relative w-full rounded-2xl border animate-[fadeIn_180ms_ease-out]', maxW].join(' ')}
        style={{ background: 'var(--a-card)', borderColor: 'var(--a-border2)', boxShadow: '0 24px 64px -24px rgba(8,12,24,0.5)' }}
      >
        {(
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <div className="min-w-0">
              {title && (
                <h2 className="text-[17px] font-bold leading-tight" style={{ color: 'var(--a-text)' }}>
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--a-text-50)' }}>
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center h-8 w-8 rounded-lg cursor-pointer shrink-0 transition-colors hover:bg-[var(--a-hover2)]"
              style={{ color: 'var(--a-text-50)' }}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        )}
        {children && <div className="px-5 pb-2 text-[14px]" style={{ color: 'var(--a-text-80)' }}>{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 mt-2 border-t" style={{ borderColor: 'var(--a-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
