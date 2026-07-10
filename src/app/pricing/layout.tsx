import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { pageMetadata } from '@/lib/seo/config';
import { faqSchema } from '@/lib/seo/schema';

export const metadata: Metadata = pageMetadata({
  title: 'Simple Pricing — Basic, Pro & Max',
  description:
    'Simple plans that grow with your business. Pick one, cancel anytime, no hidden fees.',
  path: '/pricing',
  keywords: ['pricing', 'plans', 'get found online', 'find new customers'],
});

// Mirrors the plain-language FAQ shown on the pricing page (see FAQS in
// ./page.tsx). Google requires the schema to match the on-page text, so keep
// these answers word-for-word identical to what's rendered.
const FAQ = [
  { q: 'Can I switch plans after I sign up?', a: 'Yes. You can switch between Basic, Pro, and Max anytime in your settings. When you switch, you pay the new price straight away.' },
  { q: 'What happens to my customers and business mentions if I move to a smaller plan?', a: 'Nothing is ever deleted. A smaller plan just lowers how many you get each day from then on. Everything you already have stays in your account, and it all comes back when you upgrade again.' },
  { q: 'How many customers and mentions do I get each day?', a: 'Basic gives you 10 people ready to buy and 10 business mentions a day. Pro gives you 20 people a day and 200 business mentions. Max gives you 30 to 40 people ready to buy a day, plus every mention of your business.' },
  { q: 'Do I have to sign up for a long time?', a: 'No. Monthly plans can be cancelled anytime. If you pay for a year up front, you save 20%. Yearly plans can be refunded within the first 30 days.' },
  { q: 'How many team members can use one account?', a: 'Basic is for 1 team member, Pro is for 5, and Max has no limit.' },
];

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqSchema(FAQ)} />
      {children}
    </>
  );
}
