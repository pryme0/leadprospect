import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Create Your Workspace — Start Free',
  description:
    'Spin up your SYNQ workspace in minutes. Free 14-day trial with full access to your selected modules — no credit card required.',
  path: '/signup',
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
