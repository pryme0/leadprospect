import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Integrations — Salesforce, HubSpot, Slack, LinkedIn & 30+',
  description:
    'Connect SYNQ to your CRM and outreach stack with real-time, bi-directional sync across Salesforce, HubSpot, MS Dynamics, Slack, LinkedIn, and 30+ tools.',
  path: '/integrations',
  keywords: ['Salesforce integration', 'HubSpot integration', 'CRM sync', 'LinkedIn integration', 'Slack integration'],
});

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
