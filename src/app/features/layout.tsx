import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'How SYNQ Works — Get Found & Get Customers',
  description:
    'See how SYNQ helps your business get found online and connects you with people ready to buy — in three simple steps.',
  path: '/features',
  keywords: ['get found online', 'get more customers', 'find new customers', 'grow your business', 'reach ready buyers'],
});

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
