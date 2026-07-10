'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Hub',          href: '/hub'          },
  { label: 'Features',     href: '/features'     },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Pricing',      href: '/pricing'      },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'About',        href: '/about'        },
];

export default function Navbar() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(localStorage.getItem('synq_admin_token')));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="fixed top-0 z-50 h-20 w-full border-b border-glass-stroke glass-fill shadow-sm">
      <div className="mx-auto flex h-full max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">

        {/* Left: wordmark + links */}
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="font-headline-md text-headline-md font-bold tracking-tighter text-primary"
          >
            SYNQ
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-body-md text-body-md transition-colors duration-200 ${
                  isActive(link.href)
                    ? 'border-b-2 border-primary pb-1 font-bold text-primary'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: auth actions */}
        <div className="hidden items-center gap-6 lg:flex">
          <Link
            href="/admin/login"
            className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
          >
            Log In
          </Link>
          <Link
            href={authed ? '/admin' : '/signup'}
            className="rounded-lg bg-primary-container px-6 py-2.5 font-body-md font-bold text-on-primary-container transition-all hover:brightness-110 active:scale-95"
          >
            {authed ? 'Open my account' : 'Start free'}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface lg:hidden"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">{open ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-glass-stroke bg-midnight/98 px-margin-mobile py-6 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-body-md text-body-md ${
                  isActive(link.href) ? 'font-bold text-primary' : 'text-on-surface-variant'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-glass-stroke pt-4">
              <Link href="/admin/login" className="font-body-md text-body-md text-on-surface-variant">
                Log In
              </Link>
              <Link
                href={authed ? '/admin' : '/signup'}
                className="rounded-lg bg-primary-container px-6 py-3 text-center font-body-md font-bold text-on-primary-container"
              >
                {authed ? 'Open my account' : 'Start free'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
