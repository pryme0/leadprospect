'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const WORDS = ['more customers', 'ready buyers', 'new leads', 'real sales'];

/* A handful of the real integrations list (src/app/integrations/page.tsx) —
   not a fabricated logo row. */
const WORKS_WITH = ['Salesforce', 'HubSpot', 'Slack', 'Zapier', 'Shopify', 'Pipedrive'];

export default function HomeHero() {
  const router = useRouter();
  const [wordIndex, setWordIndex] = useState(0);
  const [site, setSite] = useState('');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const t = setInterval(() => setWordIndex((i) => (i + 1) % WORDS.length), 2600);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = site.trim();
    router.push(q ? `/signup?site=${encodeURIComponent(q)}` : '/signup');
  };

  return (
    <section className="relative overflow-hidden pt-40 pb-24 md:pt-48 md:pb-32">
      <SignalField />

      <div className="relative z-10 mx-auto max-w-3xl px-margin-mobile text-center md:px-margin-desktop">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-glass-stroke bg-surface-container-lowest px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-tertiary" style={{ animation: 'home-word-in 1.6s ease-in-out infinite alternate' }} />
          <span className="font-mono-label text-mono-label uppercase text-on-surface-variant">Now live across Africa</span>
        </div>

        <h1 className="font-display-xl text-display-lg-mobile leading-[1.05] tracking-tight text-on-background md:text-display-xl">
          Get found online.
          <br />
          Get{' '}
          <span className="relative inline-block overflow-hidden align-bottom text-primary">
            <span key={wordIndex} className="home-word block whitespace-nowrap">
              {WORDS[wordIndex]}
            </span>
          </span>
          .
        </h1>

        <p className="mx-auto mt-6 max-w-xl font-body-lg text-body-lg text-on-surface-variant">
          SYNQ puts your business where <span className="text-secondary">buyers are searching</span>, and shows you
          real people who are ready to buy — so you can <span className="text-primary">reach out and win</span>.
        </p>

        <form onSubmit={handleSubmit} className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row">
          <label htmlFor="hero-site" className="sr-only">Your business website</label>
          <input
            id="hero-site"
            type="text"
            inputMode="url"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="yourbusiness.com"
            className="input-recessed h-14 flex-1 rounded-xl px-5 font-body-md text-body-md placeholder:text-outline"
          />
          <button
            type="submit"
            className="h-14 whitespace-nowrap rounded-xl bg-primary-container px-7 font-body-md font-bold text-on-primary-container transition-all hover:brightness-110 active:scale-[0.98]"
          >
            See how you show up
          </button>
        </form>
        <p className="mt-4 font-mono-label text-mono-label text-outline">
          No card needed &middot;{' '}
          <Link href="/hub" className="text-on-surface-variant underline decoration-outline-variant underline-offset-4 hover:text-primary">
            or browse the Hub directory
          </Link>
        </p>

        <div className="mt-20">
          <p className="mb-6 font-mono-label text-mono-label uppercase text-outline">Works with the tools you already use</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {WORKS_WITH.map((n) => (
              <span key={n} className="font-headline-md text-lg font-bold text-on-surface-variant">{n}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Faint network of connecting lines + drifting signal dots — an SVG, not
    canvas, so it costs nothing to hydrate and needs no animation loop. */
function SignalField() {
  const nodes = [
    [8, 22], [22, 12], [38, 30], [55, 10], [70, 26], [86, 14], [94, 34],
    [14, 48], [30, 60], [48, 46], [64, 58], [80, 50], [92, 64],
    [10, 78], [28, 88], [46, 80], [62, 92], [78, 82], [90, 90],
  ];
  const edges: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,7],[7,8],[8,9],[9,10],[10,11],[11,12],[7,13],[13,14],[14,15],[15,16],[16,17],[17,18],[2,9],[9,15],[4,10]];

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          className="home-signal-line"
          stroke="#6f2ce3"
          strokeWidth="0.15"
          style={{ animationDelay: `${(i % 7) * -0.9}s` }}
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          cx={x} cy={y} r={i % 3 === 0 ? 0.55 : 0.35}
          fill={i % 4 === 0 ? '#16a34a' : '#6f2ce3'}
          className="home-signal-dot"
          style={{ animationDelay: `${(i % 5) * -0.4}s` }}
        />
      ))}
    </svg>
  );
}
