const STATS = [
  {
    value: 'Built for Africa',
    body: 'Local pricing in Naira or dollars, and search tuned for African buyers — not a US tool with the logo swapped.',
  },
  {
    value: 'Real buyers only',
    body: 'Every lead is someone who posted that they want what you sell — not a scraped list of cold names.',
  },
  {
    value: 'No cold calling',
    body: 'You reach out once you know they are interested. They come to you already warm.',
  },
];

export default function TrustBand() {
  return (
    <section className="border-y border-glass-stroke bg-surface-bright py-20 md:py-24">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-glass-stroke bg-glass-stroke md:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.value} className="bg-surface-bright p-8 md:p-10">
              <p className="font-display-lg text-2xl font-bold text-on-background md:text-3xl">{s.value}</p>
              <p className="mt-3 font-body-md text-sm leading-relaxed text-on-surface-variant">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
