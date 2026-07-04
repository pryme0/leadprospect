import type { ReactNode } from 'react';
import Link from 'next/link';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

interface LegalShellProps {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

/**
 * Shared shell for long-form legal pages (Privacy, Terms) in the SYNQ marketing
 * design system: dark hero header, sticky table of contents on desktop, and
 * numbered content sections with anchor links.
 */
export default function LegalShell({ eyebrow, title, updated, intro, sections }: LegalShellProps) {
  return (
    <main className="relative pt-32 pb-stack-lg overflow-hidden">
      <div className="hero-glow -top-40 -left-20" />

      {/* Header */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-glass-stroke mb-6">
            <span className="material-symbols-outlined text-primary text-[16px]">gavel</span>
            <span className="font-mono-label text-mono-label uppercase text-on-surface-variant">{eyebrow}</span>
          </div>
          <h1 className="font-display-xl text-display-lg-mobile md:text-display-xl text-white mb-4">{title}</h1>
          <p className="font-mono-label text-mono-label uppercase text-outline mb-6">Last updated: {updated}</p>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{intro}</p>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="grid lg:grid-cols-[260px_1fr] gap-stack-lg">
          {/* TOC */}
          <aside className="hidden lg:block">
            <nav aria-label="Table of contents" className="sticky top-28">
              <p className="font-mono-label text-mono-label uppercase text-outline mb-4">On this page</p>
              <ul className="space-y-1 border-l border-glass-stroke">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block -ml-px border-l border-transparent pl-4 py-1.5 text-sm text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                    >
                      <span className="text-outline mr-2">{String(i + 1).padStart(2, '0')}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <article className="max-w-3xl space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="font-headline-md text-headline-md text-white mb-4 flex items-baseline gap-3">
                  <span className="font-mono-data text-mono-data text-primary">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <div className="space-y-4 font-body-md text-body-md text-on-surface-variant leading-relaxed [&_a]:text-primary [&_a]:underline hover:[&_a]:text-secondary [&_strong]:text-on-surface [&_ul]:ml-1 [&_ul]:space-y-2 [&_li]:pl-1">
                  {s.body}
                </div>
              </section>
            ))}

            {/* Footer note */}
            <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <p className="text-on-surface font-body-md font-bold">Questions about this policy?</p>
                <p className="text-sm text-on-surface-variant">We&apos;re happy to walk you through it.</p>
              </div>
              <Link
                href="/contact"
                className="btn-primary shrink-0 px-6 py-3 rounded-xl text-white font-bold hover:brightness-110 transition-all inline-flex items-center gap-2"
              >
                Contact us
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

/** Small helper for bulleted lists inside legal sections. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-none space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">chevron_right</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
