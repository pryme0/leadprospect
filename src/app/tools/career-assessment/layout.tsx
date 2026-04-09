import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GRC Career Readiness Assessment — Free 8-Question Quiz',
  description:
    'Take a free 8-question quiz to discover your readiness for a GRC (Governance, Risk & Compliance) career. Get a personalized learning plan with certification recommendations.',
  openGraph: {
    title: 'GRC Career Readiness Assessment — Free Quiz',
    description: 'Discover your readiness for a GRC career in 8 questions. Free AI-powered assessment.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
