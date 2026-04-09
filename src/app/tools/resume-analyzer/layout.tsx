import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resume Analyzer — Free GRC Resume Gap Analysis',
  description:
    'Upload your resume and get AI-powered feedback to optimize it for GRC roles (Analyst, Auditor, Risk, Compliance). Specific improvements to land more interviews.',
  openGraph: {
    title: 'Resume Analyzer — Free GRC Resume Gap Analysis',
    description: 'AI-powered resume analysis for GRC cybersecurity roles. Upload your PDF for instant feedback.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
