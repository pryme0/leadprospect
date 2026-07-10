'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TOOL_LABELS: Record<string, string> = {
  'audience-fit': 'Your free report',
  'lead-score': 'Your free report',
  enrichment: 'Your free report',
  routing: 'Your free report',
};

const NEXT_STEPS = [
  {
    step: '1',
    title: 'Check your report',
    body: 'We’ve sent a simple summary of the customers we found for you to your inbox.',
  },
  {
    step: '2',
    title: 'Connect your accounts',
    body: 'Link your Google, TikTok, Instagram, website and more — all in one place.',
  },
  {
    step: '3',
    title: 'Start reaching out',
    body: 'Message the best customers and keep track of every conversation.',
  },
];

function ThankYouContent() {
  const params = useSearchParams();
  const tool = params.get('tool') || '';
  const toolLabel = TOOL_LABELS[tool] || 'Your free report';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#b8dce6] bg-white text-lg font-black text-[#112126] shadow-sm">
          PG
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
          Request received
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-[#0a1128] md:text-5xl">
          Your SYNQ account is ready.
        </h1>
        <p className="mx-auto mb-2 max-w-2xl text-lg text-brand-muted">
          Your <span className="font-semibold text-[#00CEC8]">{toolLabel}</span> has been unlocked.
        </p>
        <p className="mx-auto mb-10 max-w-xl text-brand-muted">
          Someone from our team will follow up to help you connect your accounts and start finding customers.
        </p>

        <div className="mb-10 grid gap-4 text-left md:grid-cols-3">
          {NEXT_STEPS.map((item) => (
            <div key={item.step} className="card">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#00CEC8]/20 text-sm font-bold text-[#00CEC8]">
                {item.step}
              </div>
              <h3 className="mb-1 font-semibold text-[#0a1128]">{item.title}</h3>
              <p className="text-sm text-brand-muted">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/admin" className="btn-primary">
            Open my account
          </Link>
          <Link href="/" className="btn-secondary">
            Back to SYNQ
          </Link>
        </div>

        <p className="mt-10 text-sm text-brand-muted">
          Everything you need to find customers and reach out — in one simple place.
        </p>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}
