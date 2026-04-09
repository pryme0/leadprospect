'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const TOOL_LABELS: Record<string, string> = {
  'cyber-path-finder': 'Cyber Path Finder',
  'career-assessment': 'Career Assessment',
  'resume-analyzer': 'Resume Analyzer',
};

const NEXT_STEPS = [
  {
    step: '1',
    title: 'Check Your Email',
    body: 'Your personalised report has been sent to your inbox. Check spam if you don\'t see it within 5 minutes.',
  },
  {
    step: '2',
    title: 'Book a Strategy Call',
    body: 'Schedule a free 30-minute call with an EMC advisor to map out your exact cybersecurity career path.',
  },
  {
    step: '3',
    title: 'Join the Community',
    body: 'Connect with 2,000+ cybersecurity career switchers in our private community for daily support and accountability.',
  },
];

function ThankYouContent() {
  const params = useSearchParams();
  const tool = params.get('tool') || '';
  const toolLabel = TOOL_LABELS[tool] || 'EMC Tool';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">

        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#0BAAEF] to-[#40C4FF] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-brand-darker" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          You're In! 🎉
        </h1>
        <p className="text-brand-muted text-lg mb-2">
          Your <span className="text-[#0BAAEF] font-semibold">{toolLabel}</span> results have been unlocked.
        </p>
        <p className="text-brand-muted mb-10">
          An EMC advisor will be in touch within 24 hours.
        </p>

        {/* Next Steps */}
        <div className="grid gap-4 md:grid-cols-3 mb-10 text-left">
          {NEXT_STEPS.map((item) => (
            <div key={item.step} className="card">
              <div className="w-8 h-8 bg-[#0BAAEF]/20 text-[#0BAAEF] rounded-lg flex items-center justify-center font-bold text-sm mb-3">
                {item.step}
              </div>
              <h3 className="text-white font-semibold mb-1">{item.title}</h3>
              <p className="text-brand-muted text-sm">{item.body}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://excelmindcyber.com/book"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Book Your Free Strategy Call
          </a>
          <Link href="/" className="btn-secondary">
            Explore More Tools
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-brand-muted text-sm mt-10">
          Trusted by <span className="text-white font-semibold">2,000+</span> cybersecurity career switchers across the US and Canada.
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
