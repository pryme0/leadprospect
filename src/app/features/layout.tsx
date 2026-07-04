import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';

export const metadata: Metadata = pageMetadata({
  title: 'Features — Signal Capture, Intent Scoring & Lead Routing',
  description:
    "Capture real-time buying signals, score intent with AI, dedupe and attribute every lead, and auto-route to the right rep. See how SYNQ's revenue engine works.",
  path: '/features',
  keywords: ['signal capture', 'AI intent scoring', 'lead deduplication', 'lead source attribution', 'automated lead routing'],
});

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
