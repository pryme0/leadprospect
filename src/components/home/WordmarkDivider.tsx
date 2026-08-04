'use client';

import { useEffect, useRef, useState } from 'react';

/** Large outline wordmark that fills in left-to-right as it scrolls through
    the viewport — a quiet callback to the SYNQ mark right before the footer. */
export default function WordmarkDivider() {
  const ref = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setFill(1); return; }

    // Progress is driven purely by how far the mark's own top edge has moved
    // up the viewport — not by scrolling it fully past — so it still reaches
    // 100% even when it's the last thing on the page (nothing to scroll past).
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh - rect.top) / (vh * 0.7);
      setFill(Math.min(1, Math.max(0, progress)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} className="overflow-hidden bg-surface py-10 md:py-16">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <p
          className="select-none text-center font-display-xl font-black leading-none"
          style={{
            fontSize: 'clamp(4rem, 16vw, 11rem)',
            letterSpacing: '-0.03em',
            WebkitTextStroke: '1.5px rgba(10,17,40,0.16)',
            color: 'transparent',
            backgroundImage: `linear-gradient(90deg, #0a1128 ${fill * 100}%, transparent ${fill * 100}%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
        >
          SYNQ
        </p>
      </div>
    </div>
  );
}
