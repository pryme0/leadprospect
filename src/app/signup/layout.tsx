import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Create Your Free Account',
  description:
    'Create your free SYNQ account in minutes and start getting found online and finding new customers. No card needed.',
  path: '/signup',
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
