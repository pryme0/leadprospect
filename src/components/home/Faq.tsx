'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'How is this different from running ads?',
    a: 'Ads interrupt people who may or may not want what you sell. SYNQ finds people who have already said, in public, that they want it — so you reach out to someone warm instead of hoping a stranger clicks.',
  },
  {
    q: 'Do I need any technical skills to use it?',
    a: 'No. You sign up, tell us about your business, and SYNQ starts working. No setup, no code, no dashboard you need a manual for.',
  },
  {
    q: 'Which platforms does SYNQ watch for buyers?',
    a: 'LinkedIn, TikTok and Instagram today, alongside Google and AI search for getting your business found — with more platforms added regularly.',
  },
  {
    q: 'Is SYNQ only for businesses in Africa?',
    a: 'It is built for African businesses first — local pricing, local search behaviour, local buyers — but it works for any business that wants to be found and reach real customers.',
  },
  {
    q: 'What happens right after I sign up?',
    a: 'We ask a few questions about what you sell and who you sell it to, then SYNQ starts watching for buyers and getting your business found. Most accounts see their first leads within days.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-surface py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-margin-mobile md:px-margin-desktop">
        <div className="mb-14 text-center">
          <span className="font-mono-label text-mono-label uppercase text-secondary">Questions</span>
          <h2 className="font-display-lg text-display-lg-mobile mt-4 text-on-background md:text-display-lg">
            Everything you were about to ask.
          </h2>
        </div>

        <div className="divide-y divide-glass-stroke border-y border-glass-stroke">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="home-accordion-row" data-open={isOpen}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-6 text-left"
                >
                  <span className="font-body-lg font-semibold text-on-background">{item.q}</span>
                  <span className="home-accordion-chevron material-symbols-outlined shrink-0 text-outline">expand_more</span>
                </button>
                <div className="home-accordion-panel">
                  <div>
                    <p className="pb-6 pr-10 font-body-md text-body-md text-on-surface-variant">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
