'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  // Auth is the presence of the admin token in localStorage (set on
  // login/signup). Read it after mount to avoid an SSR hydration mismatch.
  useEffect(() => {
    setAuthed(Boolean(localStorage.getItem('prospectgrid_admin_token')));
  }, []);

  // Workspace-only links stay hidden until the visitor is authenticated.
  const publicLinks = [
    { href: '/', label: 'Workspace' },
    { href: '/signup', label: 'Sign up' },
  ];
  const authedLinks = [
    { href: '/admin/signals', label: 'Signals' },
    { href: '/admin/leads', label: 'Leads' },
    { href: '/admin/integrations', label: 'Integrations' },
  ];
  const navLinks = authed ? [...publicLinks, ...authedLinks] : publicLinks;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#d4e7ee] bg-[#f7fbff]/92 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#b8dce6] bg-white text-[13px] font-black tracking-tight text-[#112126] shadow-sm">
              PG
            </span>
            <div className="hidden sm:block">
              <span className="text-[#112126] font-bold text-lg">ProspectGrid</span>
              <span className="hidden md:inline text-[#607783] text-xs ml-2">
                Lead intelligence platform
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-[#4b6470] hover:text-[#112126] transition-colors rounded-lg hover:bg-[#e8f6fa]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/signup"
              className="ml-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-[#009B98] hover:bg-[#112126] transition-colors"
            >
              Create workspace
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#4b6470] hover:text-[#112126] transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="md:hidden pb-4 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-[#4b6470] hover:text-[#112126] hover:bg-[#e8f6fa] rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
