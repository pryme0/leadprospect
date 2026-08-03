import Link from 'next/link';

export default function FinalCta() {
  return (
    <section className="px-margin-mobile pb-24 md:px-margin-desktop md:pb-32">
      <div className="relative mx-auto max-w-container-max overflow-hidden rounded-[2.5rem] bg-midnight p-12 text-center md:p-24">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-40 blur-[120px]"
          style={{ backgroundColor: '#6f2ce3' }}
        />
        <div className="relative z-10">
          <h2 className="font-display-lg text-display-lg-mobile mb-6 leading-[1.05] text-white md:text-display-xl">
            Your next customer is
            <br className="hidden md:block" /> already looking for you.
          </h2>
          <p className="mx-auto mb-10 max-w-xl font-body-lg text-body-lg text-white/70">
            Let SYNQ find them and bring them to you — so you can focus on serving customers, not chasing them.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-2xl bg-primary-container px-12 py-5 text-lg font-extrabold text-on-primary-container shadow-xl transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Start free now
          </Link>
          <p className="mt-6 font-mono-label text-mono-label text-white/40">No card needed. Setup takes 2 minutes.</p>
        </div>
      </div>
    </section>
  );
}
