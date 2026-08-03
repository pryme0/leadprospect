/* Honest stand-in for a testimonial wall. SYNQ is new and won't fake reviews
   (see /testimonials) — so instead of invented quotes, this scrolls the real
   reasons business owners try SYNQ, pulled from the same values used on
   /about. Same visual rhythm as a marquee wall, none of the fabrication. */

const ROW_1 = [
  'Real buyers, not noise',
  'Reach people while they’re still interested',
  'Built for everyday business owners',
  'Contacts you can actually use',
];

const ROW_2 = [
  'Get found on Google and AI search',
  'Reach people who are ready to buy',
  'Clean, usable contacts every time',
  'Built for businesses in Africa',
];

const ROW_3 = [
  'No cold calling, ever',
  'Cancel anytime, no long contracts',
  'Honest pricing, no surprises',
  'One inbox for every channel',
];

export default function ValuesMarquee() {
  return (
    <section className="overflow-hidden bg-surface py-24 md:py-32">
      <div className="mx-auto mb-14 max-w-container-max px-margin-mobile text-center md:px-margin-desktop">
        <span className="font-mono-label text-mono-label uppercase text-tertiary">Why business owners try SYNQ</span>
        <h2 className="font-display-lg text-display-lg-mobile mt-4 text-on-background md:text-display-lg">
          Not what we say. What we actually built.
        </h2>
      </div>

      <div className="space-y-5">
        <MarqueeRow items={ROW_1} duration={32} />
        <MarqueeRow items={ROW_2} duration={38} reverse />
        <MarqueeRow items={ROW_3} duration={26} />
      </div>
    </section>
  );
}

function MarqueeRow({ items, duration, reverse }: { items: string[]; duration: number; reverse?: boolean }) {
  const loop = [...items, ...items];
  return (
    <div className="group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className="flex shrink-0 gap-5 pr-5 motion-safe:animate-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {loop.map((text, i) => (
          <div
            key={`${text}-${i}`}
            className="flex w-[280px] shrink-0 items-center gap-3 rounded-2xl border border-glass-stroke bg-surface-bright px-6 py-5"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <p className="font-body-md text-sm font-medium leading-snug text-on-surface">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
