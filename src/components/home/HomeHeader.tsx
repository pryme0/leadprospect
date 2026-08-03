'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const PRODUCTS: { icon: string; title: string; body: string; href: string }[] = [
  { icon: 'travel_explore', title: 'Lead discovery', body: 'Find people asking for what you sell across LinkedIn, TikTok & Instagram.', href: '/features' },
  { icon: 'contact_page', title: 'Contact enrichment', body: 'Clean, verified email and phone details for every lead.', href: '/features' },
  { icon: 'forum', title: 'Outreach inbox', body: 'One inbox for every channel, with suggested replies.', href: '/features' },
  { icon: 'route', title: 'Pipeline tracker', body: 'See every deal, from first contact to won.', href: '/features' },
  { icon: 'hub', title: 'SYNQ Hub', body: 'A directory of African businesses, ranked by real interest.', href: '/hub' },
  { icon: 'sync', title: 'Integrations', body: 'Connect the CRM and tools your team already uses.', href: '/integrations' },
];

export default function HomeHeader() {
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-glass-stroke bg-glass-fill backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link href="/" className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/synq-logo.png" alt="SYNQ" className="h-9 w-8 object-cover object-left" />
          <span className="font-headline-md text-2xl font-extrabold tracking-tight text-on-background">SYNQ</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface-variant transition-colors hover:text-primary"
              aria-expanded={productsOpen}
              onClick={() => setProductsOpen((v) => !v)}
            >
              Products
              <span className={`material-symbols-outlined text-[18px] transition-transform ${productsOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {productsOpen && (
              <div className="absolute left-1/2 top-full w-[520px] -translate-x-1/2 pt-3">
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-glass-stroke bg-surface-bright p-3 shadow-[0_20px_60px_-20px_rgba(10,17,40,0.25)]">
                  {PRODUCTS.map((p) => (
                    <Link
                      key={p.title}
                      href={p.href}
                      className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined mt-0.5 text-xl text-primary">{p.icon}</span>
                      <span>
                        <span className="block font-body-md text-sm font-bold text-on-background">{p.title}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-on-surface-variant">{p.body}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="/pricing" className="rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface-variant transition-colors hover:text-primary">
            Pricing
          </Link>
          <Link href="/about" className="rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface-variant transition-colors hover:text-primary">
            About
          </Link>
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <Link href="/admin/login" className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-primary">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary-container px-6 py-2.5 font-body-md font-bold text-on-primary-container transition-all hover:brightness-110 active:scale-95"
          >
            Start free
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface lg:hidden"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-glass-stroke bg-surface-bright px-margin-mobile py-6 lg:hidden">
          <div className="flex flex-col gap-1">
            {PRODUCTS.map((p) => (
              <Link key={p.title} href={p.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 font-body-md text-on-surface">
                {p.title}
              </Link>
            ))}
            <div className="my-2 border-t border-glass-stroke" />
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 font-body-md text-on-surface">Pricing</Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 font-body-md text-on-surface">About</Link>
            <div className="mt-3 flex flex-col gap-3 border-t border-glass-stroke pt-4">
              <Link href="/admin/login" onClick={() => setMobileOpen(false)} className="font-body-md text-on-surface-variant">Log in</Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-primary-container px-6 py-3 text-center font-body-md font-bold text-on-primary-container"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
