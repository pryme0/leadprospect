import type { Metadata } from 'next';
import './globals.css';
import ConditionalNavbar from '@/components/ConditionalNav';
import ConditionalFooter from '@/components/ConditionalFooter';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import Amplitude from '@/components/Amplitude';
import TawkTo from '@/components/TawkTo';
import {
  GoogleTagManagerHead,
  GoogleTagManagerNoscript,
} from '@/components/GoogleTagManager';

const SITE_URL = 'https://emci.lie.thelixholdings.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ExcelMindCyber — Free GRC Career Tools | Governance, Risk & Compliance',
    template: '%s | ExcelMindCyber',
  },
  description:
    'Launch your Governance, Risk & Compliance (GRC) career with free AI-powered tools. Get a personalized 90-day GRC roadmap, career readiness assessment, and resume gap analysis. Trusted by 2,000+ career switchers in the US and Canada.',
  keywords: [
    'GRC career', 'governance risk compliance', 'cybersecurity career', 'GRC analyst',
    'IT auditor career', 'risk analyst', 'compliance analyst', 'CRISC', 'CISA',
    'ISO 27001', 'CompTIA Security+', 'cybersecurity career change', 'GRC roadmap',
    'cybersecurity resume analyzer', 'career assessment cybersecurity', 'ExcelMindCyber',
    'break into cybersecurity', 'GRC training', 'cybersecurity certification path',
  ],
  authors: [{ name: 'ExcelMindCyber', url: SITE_URL }],
  creator: 'ExcelMindCyber',
  publisher: 'ExcelMindCyber',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'ExcelMindCyber',
    title: 'ExcelMindCyber — Free GRC Career Tools',
    description:
      'Launch your GRC career with free AI-powered tools: 90-day roadmap, career readiness quiz, and resume analyzer. Start your cybersecurity career transition today.',
    images: [
      {
        url: '/emclogo.png',
        width: 219,
        height: 249,
        alt: 'ExcelMindCyber Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'ExcelMindCyber — Free GRC Career Tools',
    description:
      'Launch your GRC career with free AI tools: 90-day roadmap, career readiness quiz, and resume analyzer.',
    images: ['/emclogo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* GTM container loader — fires as soon as the page is interactive */}
        <GoogleTagManagerHead />
      </head>
      <body className="min-h-screen flex flex-col">
        {/* GTM noscript fallback must be the FIRST child of <body> */}
        <GoogleTagManagerNoscript />
        <GoogleAnalytics />
        <Amplitude />
        <TawkTo />
        <ConditionalNavbar />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
