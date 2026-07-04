'use client';

import { useEffect, useRef } from 'react';

/**
 * Themed confirmation dialog for the admin shell (used for sign-out confirm and
 * the inactivity auto-logout warning). Works in both light and dark via the
 * --a-* tokens. Scrim + Escape-to-cancel + focus-on-confirm per a11y guidance.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const danger = tone === 'danger';
  const accent = danger ? '#EF4444' : '#6D5EF9';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(3,8,15,0.60)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="w-full max-w-[380px] overflow-hidden rounded-2xl"
        style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.5)' }}
      >
        <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center">
          <span
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: `${accent}18`, color: accent }}
          >
            {danger ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            )}
          </span>
          <h2 id="confirm-modal-title" className="text-[16px] font-bold" style={{ color: 'var(--a-text)' }}>{title}</h2>
          <div className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--a-text-60)' }}>{message}</div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--a-hover2)', color: 'var(--a-text-80)' }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{ background: accent }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
