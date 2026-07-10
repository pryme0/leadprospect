import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Connect the Tools You Already Use',
  description:
    'Link SYNQ to the everyday tools you already use — your customer list, email, messaging and more. Simple to set up, no technical skills needed.',
  path: '/integrations',
  keywords: ['connect your tools', 'customer list', 'email', 'messaging apps', 'easy setup'],
});

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
