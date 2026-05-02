'use client';

import { useEffect, useRef, useState } from 'react';
import HomepagePromptModal from './HomepagePromptModal';
import { captureUtmsFromUrl } from '@/lib/utm';

// Cadence (ms) for the homepage prompt modal:
//   - First open ~30s after landing — long enough to start reading,
//     short enough to catch bounces.
//   - If dismissed: re-open at 90s, then at 3min, then stop.
//   - Exit-intent (mouse leaves out the top of the viewport) fires once
//     between regular triggers if the modal isn't already showing.
//   - Stops permanently for 30 days after a successful submit.
//
// Storage key (localStorage):
//   emc_homepage_prompt_state = JSON { submittedAt: number | null, dismissedCount: number }
const STATE_KEY = 'emc_homepage_prompt_state';
const SUBMITTED_TTL_DAYS = 30;
const TRIGGER_DELAYS_MS = [30_000, 90_000, 180_000];

interface PromptState {
  submittedAt: number | null;
  dismissedCount: number;
}

function readState(): PromptState {
  if (typeof window === 'undefined') return { submittedAt: null, dismissedCount: 0 };
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { submittedAt: null, dismissedCount: 0 };
    const parsed = JSON.parse(raw);
    return {
      submittedAt: typeof parsed.submittedAt === 'number' ? parsed.submittedAt : null,
      dismissedCount: typeof parsed.dismissedCount === 'number' ? parsed.dismissedCount : 0,
    };
  } catch {
    return { submittedAt: null, dismissedCount: 0 };
  }
}

function writeState(s: PromptState): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* quota/private mode */ }
}

function isRecentlySubmitted(s: PromptState): boolean {
  if (!s.submittedAt) return false;
  const age = Date.now() - s.submittedAt;
  return age < SUBMITTED_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export default function HomepagePromptOrchestrator() {
  const [open, setOpen] = useState(false);
  const [pitchIndex, setPitchIndex] = useState(0);
  const stateRef = useRef<PromptState>({ submittedAt: null, dismissedCount: 0 });
  const timerRef = useRef<number | null>(null);
  const exitIntentArmedRef = useRef(false);

  // Schedule the next trigger based on how many times this visitor has
  // already dismissed it. Returns null when we've exhausted the schedule.
  const scheduleNext = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const idx = stateRef.current.dismissedCount;
    const delay = TRIGGER_DELAYS_MS[idx];
    if (delay == null) return; // exhausted
    timerRef.current = window.setTimeout(() => {
      // Don't re-open if a different surface (LeadCaptureModal etc.) is
      // already showing — heuristic: another fixed-inset element with our
      // dialog role is on screen.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        scheduleNext();
        return;
      }
      setPitchIndex(idx);
      setOpen(true);
    }, delay);
  };

  useEffect(() => {
    stateRef.current = readState();
    // Snapshot inbound UTMs on first mount so they're available later when
    // the modal submits, even after client-side navigation strips the
    // querystring. No-op if the URL has no utm_* params.
    captureUtmsFromUrl();
    if (isRecentlySubmitted(stateRef.current)) return; // already converted recently
    scheduleNext();

    // Exit-intent: mouse moves up past the top edge with intent to close
    // the tab / switch tabs. Only fires once per session and only when no
    // modal is open.
    const onMouseLeave = (e: MouseEvent) => {
      if (exitIntentArmedRef.current) return;
      if (e.clientY > 0) return; // not actually leaving the viewport
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (isRecentlySubmitted(stateRef.current)) return;
      if (stateRef.current.dismissedCount >= TRIGGER_DELAYS_MS.length) return;
      exitIntentArmedRef.current = true;
      // Cancel the pending scheduled trigger — the exit intent supersedes it.
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setPitchIndex(stateRef.current.dismissedCount);
      setOpen(true);
    };
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', onMouseLeave);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setOpen(false);
    const next: PromptState = {
      submittedAt: stateRef.current.submittedAt,
      dismissedCount: stateRef.current.dismissedCount + 1,
    };
    stateRef.current = next;
    writeState(next);
    scheduleNext();
  };

  const handleSubmitted = () => {
    const next: PromptState = {
      submittedAt: Date.now(),
      dismissedCount: stateRef.current.dismissedCount,
    };
    stateRef.current = next;
    writeState(next);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Modal stays open showing the success state — closes when the user
    // hits "Keep exploring", which calls handleClose.
  };

  return (
    <HomepagePromptModal
      isOpen={open}
      pitchIndex={pitchIndex}
      onClose={handleClose}
      onSubmitted={handleSubmitted}
    />
  );
}
