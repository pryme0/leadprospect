'use client';

import { useEffect, useRef, useState } from 'react';

const REASONS = ['No budget', 'Went with a competitor', 'Not a fit', 'No response', 'Other'];

/**
 * Confirmation dialog for moving a pipeline lead to "Lost" — requires a reason.
 * Mirrors ConfirmModal.tsx's prop/style conventions (--a-* tokens, scrim, Escape
 * to cancel) but adds the reason dropdown + optional note this transition needs.
 */
export default function LostReasonModal({
  open,
  leadName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  leadName?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setReason(REASONS[0]);
    setNote('');
    const t = setTimeout(() => confirmRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    const final = note.trim() ? `${reason} — ${note.trim()}` : reason;
    onConfirm(final);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(3,8,15,0.60)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lost-reason-title"
    >
      <div
        className="w-full max-w-[400px] overflow-hidden rounded-2xl"
        style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border2)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.5)' }}
      >
        <div className="flex flex-col px-6 pt-7 pb-5">
          <span
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: '#EF444418', color: '#EF4444' }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </span>
          <h2 id="lost-reason-title" className="text-[16px] font-bold" style={{ color: 'var(--a-text)' }}>
            Mark {leadName || 'this lead'} as Lost
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--a-text-60)' }}>
            Tell us why so you can spot patterns later.
          </p>

          <label className="mt-4 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1.5 rounded-xl border px-3 py-2.5 text-[13px] outline-none"
            style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
          >
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <label className="mt-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--a-text-50)' }}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Any extra detail…"
            className="mt-1.5 resize-none rounded-xl border px-3 py-2.5 text-[13px] outline-none"
            style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
          />
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--a-hover2)', color: 'var(--a-text-80)' }}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={submit}
            className="min-h-11 flex-1 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110"
            style={{ background: '#EF4444' }}
          >
            Mark Lost
          </button>
        </div>
      </div>
    </div>
  );
}
