'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  if (pathname?.endsWith('-so') || pathname?.endsWith('-cr')) return null;
  return <Navbar />;
}
