import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cyber Path Finder — Free 90-Day GRC Career Roadmap',
  description:
    'Get a personalized 90-day Governance, Risk & Compliance (GRC) career roadmap. AI-powered, tailored to your background, country, and income goal. Certifications: CRISC, CISA, ISO 27001.',
  openGraph: {
    title: 'Cyber Path Finder — Free 90-Day GRC Career Roadmap',
    description: 'Get a personalized 90-day GRC career transition plan powered by AI.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
