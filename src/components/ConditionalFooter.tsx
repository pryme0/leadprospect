'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  if (pathname?.endsWith('-so') || pathname?.endsWith('-cr')) return null;
  return <Footer />;
}
