import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Contact SYNQ — Talk to Sales, Support & Our Team',
  description:
    'Get in touch with SYNQ. Reach sales for a demo, support for help with your account, or send us a note. We reply to every message within one business day.',
  path: '/contact',
  keywords: ['contact SYNQ', 'SYNQ demo', 'SYNQ support', 'sales contact'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
