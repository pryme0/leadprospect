import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { faqSchema } from '@/lib/seo/schema';

export const metadata: Metadata = pageMetadata({
  title: 'Pricing — Basic, Pro & Max Plans',
  description:
    'Simple, transparent tiers for lead intelligence and social inbox management: Basic, Pro, and Max. Pick the plan that matches your team\'s scale — no hidden fees.',
  path: '/pricing',
  keywords: ['sales intelligence pricing', 'lead intelligence pricing', 'B2B SaaS pricing tiers'],
});

// Mirrors the real Basic/Pro/Max tiers in src/lib/subscription/tiers.ts and the
// visible pricing cards in this page (required: schema must match on-page content).
const FAQ = [
  { q: 'Can I switch plans after signing up?', a: 'Yes — switch between Basic, Pro, and Max at any time from your subscription settings. Switching charges the new plan\'s full price immediately; there\'s no proration.' },
  { q: 'What happens to my leads and mentions if I downgrade?', a: 'Nothing is ever deleted. Downgrading just lowers your daily allowance going forward — anything already generated stays in your account and reappears in full the moment you upgrade again.' },
  { q: 'What counts toward the daily lead and mention limits?', a: 'Basic includes 5 HIGH-intent leads and 10 brand mentions per day. Pro raises that to 50 leads and 200 mentions per day. Max is unlimited on both.' },
  { q: 'Is there a minimum commitment?', a: 'Monthly plans have no minimum commitment — cancel anytime. Annual plans are paid upfront at a 20% discount and are non-refundable after 30 days.' },
  { q: 'How many team members can use one account?', a: 'Basic includes 1 seat, Pro includes 5 seats, and Max includes unlimited team seats.' },
];

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqSchema(FAQ)} />
      {children}
    </>
  );
}
