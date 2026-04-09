import type { Metadata } from 'next';
import './globals.css';
import ConditionalNavbar from '@/components/ConditionalNav';
import ConditionalFooter from '@/components/ConditionalFooter';

export const metadata: Metadata = {
  title: 'ExcelMindCyber - Your Cybersecurity Career Starts Here',
  description:
    'Free cybersecurity career tools: Career Path Finder, Skills Assessment, and Resume Analyzer. Start your journey into cybersecurity with ExcelMindCyber.',
  keywords: 'cybersecurity career, cyber security training, career path, resume analyzer, skills assessment',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <ConditionalNavbar />
        <main className="flex-1">{children}</main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
