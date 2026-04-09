'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/tools/cyber-path-finder', label: 'Cyber Path Finder' },
    { href: '/tools/career-assessment', label: 'Career Assessment' },
    { href: '/tools/resume-analyzer', label: 'Resume Analyzer' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-brand-slate/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/emclogo.png" alt="EMC Logo" className="w-9 h-9 object-contain shrink-0" />
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg">ExcelMindCyber</span>
              <span className="hidden md:inline text-brand-muted text-xs ml-2">
                Your Cybersecurity Career Starts Here
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm text-brand-muted hover:text-[#0BAAEF] transition-colors rounded-lg hover:bg-brand-slate/30"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-brand-muted hover:text-white transition-colors"
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
                className="block px-4 py-3 text-brand-muted hover:text-[#0BAAEF] hover:bg-brand-slate/30 rounded-lg transition-colors"
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
