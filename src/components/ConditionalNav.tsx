'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  // Home renders its own light-themed header (redesigned landing page).
  if (pathname === '/') return null;
  if (pathname === '/signup') return null;
  if (pathname?.endsWith('-so') || pathname?.endsWith('-cr')) return null;
  return <Navbar />;
}
