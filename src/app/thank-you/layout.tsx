import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Thank You',
  description: 'Thanks — your request has been received. Our team will be in touch shortly.',
  path: '/thank-you',
  noindex: true, // post-conversion page: keep out of the index
});

export default function ThankYouLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
