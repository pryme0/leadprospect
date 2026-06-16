import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ConditionalNavbar from '@/components/ConditionalNav';
import ConditionalFooter from '@/components/ConditionalFooter';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains' });

const SITE_URL = 'https://prospectgrid.demo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ProspectGrid — Lead Intelligence Platform for Business Growth',
    template: '%s | ProspectGrid',
  },
  description:
    'Find, enrich, score, and route business leads from Google Ads, Facebook Ads, TikTok Ads, Instagram Ads, website forms, CRM data, and social buying signals.',
  keywords: [
    'lead intelligence', 'lead generation', 'business leads', 'ad attribution',
    'Google Ads leads', 'Facebook Ads leads', 'TikTok Ads leads', 'Instagram Ads leads',
    'lead enrichment', 'lead scoring', 'sales intelligence', 'CRM enrichment',
    'B2B lead generation', 'pipeline intelligence', 'ProspectGrid',
  ],
  authors: [{ name: 'ProspectGrid', url: SITE_URL }],
  creator: 'ProspectGrid',
  publisher: 'ProspectGrid',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'ProspectGrid',
    title: 'ProspectGrid — Lead Intelligence Platform',
    description:
      'Unify ad platforms, website forms, CRM rows, and social signals into scored business leads your team can act on.',
    images: [
      {
        url: '/icon-512.png',
        width: 219,
        height: 249,
        alt: 'ProspectGrid Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'ProspectGrid — Lead Intelligence Platform',
    description:
      'Find, enrich, score, and route business leads from ads, forms, CRM, and social buying signals.',
    images: ['/icon-512.png'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <ConditionalNavbar />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
