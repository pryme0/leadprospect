'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(localStorage.getItem('prospectgrid_admin_token')));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const publicLinks = [
    { href: '/', label: 'Product' },
    { href: '/signup', label: 'Sign up' },
  ];
  const authedLinks = [
    { href: '/admin/signals', label: 'Signals' },
    { href: '/admin/leads', label: 'Leads' },
    { href: '/admin/integrations', label: 'Integrations' },
  ];
  const navLinks = authed ? [...publicLinks, ...authedLinks] : publicLinks;

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white shadow-[0_1px_0_#E2E8F0] shadow-sm'
          : 'bg-white/95 border-b border-[#E2E8F0]'
      } backdrop-blur`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B132B] text-white text-[12px] font-black tracking-tight shadow-sm group-hover:bg-[#2563EB] transition-colors duration-200">
              PG
            </span>
            <div className="hidden sm:block">
              <span className="text-[#0B132B] font-bold text-[17px] tracking-tight">ProspectGrid</span>
              <span className="hidden md:inline text-[#94A3B8] text-xs ml-2 font-medium">
                Lead intelligence
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0B132B] transition-colors rounded-lg hover:bg-[#F8FAFC]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/signup"
              className="ml-3 px-5 py-2.5 text-sm font-semibold text-white rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors duration-200 shadow-sm"
            >
              Create workspace
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#64748B] hover:text-[#0B132B] transition-colors rounded-lg hover:bg-[#F8FAFC]"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-[#F1F5F9] animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-[#64748B] hover:text-[#0B132B] hover:bg-[#F8FAFC] rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 px-1">
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="block text-center w-full px-5 py-3 text-sm font-semibold text-white rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors duration-200"
              >
                Create workspace
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
