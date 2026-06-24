'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  WorkspaceConfig,
  getWorkspaceConfig,
} from '@/lib/workspace';

interface NavLink {
  href: string;
  label: string;
  ord: string;
  icon: React.ReactNode;
  badge?: string;
}

const navGroups: { title: string; items: NavLink[] }[] = [
  {
    title: 'Workbench',
    items: [
      {
        href: '/admin', label: 'Command Center', ord: '01',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" d="M3 13l9-9 9 9M5 11v9a1 1 0 001 1h12a1 1 0 001-1v-9" />
          </svg>
        ),
      },
      {
        href: '/admin/pipeline', label: 'Lead Pipeline', ord: '02', badge: 'Live',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        href: '/admin/explore', label: 'Source Explorer', ord: '03',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Data',
    items: [
      {
        href: '/admin/signals', label: 'Buying Signals', ord: '04',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" d="M3 12h3l3-9 6 18 3-9h3" />
          </svg>
        ),
      },
      {
        href: '/admin/leads', label: 'Lead Queue', ord: '05',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <circle cx="9" cy="8" r="3" />
            <path strokeLinecap="round" d="M3 21v-1a6 6 0 016-6h0a6 6 0 016 6v1M16 3.5a3 3 0 010 6M21 21v-1a5 5 0 00-3.5-4.78" />
          </svg>
        ),
      },
      {
        href: '/admin/outreach', label: 'Routing Desk', ord: '06', badge: 'New',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8l9-5 9 5" />
          </svg>
        ),
      },
      {
        href: '/admin/email', label: 'Email Desk', ord: '07',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 6 8-6" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Org',
    items: [
      {
        href: '/admin/users', label: 'Team', ord: '08',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <circle cx="9" cy="8" r="3" />
            <path strokeLinecap="round" d="M3 20v-1a6 6 0 0112 0v1M17 11a3 3 0 010-6M21 20v-1a5 5 0 00-3.5-4.78" />
          </svg>
        ),
      },
      {
        href: '/admin/integrations', label: 'Integrations', ord: '09',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 16h8M4 12h16M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3z" />
          </svg>
        ),
      },
      {
        href: '/admin/settings', label: 'Settings', ord: '10',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Command Center',
  '/admin/pipeline': 'Lead Pipeline',
  '/admin/explore': 'Source Explorer',
  '/admin/signals': 'Buying Signals',
  '/admin/leads': 'Lead Queue',
  '/admin/outreach': 'Routing Desk',
  '/admin/email': 'Email Desk',
  '/admin/users': 'Team',
  '/admin/integrations': 'Integrations',
  '/admin/settings': 'Settings',
};

function BrandMark({ workspace }: { workspace: WorkspaceConfig }) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center text-[10px] font-bold shrink-0"
      style={{
        background: 'rgba(37,99,235,0.12)',
        color: '#2563EB',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: 'var(--t-radius-sm)',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.02em',
      }}
    >
      {workspace.initials}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    localStorage.setItem('prospectgrid_theme', 'light');
    setTheme('light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('prospectgrid_theme', next);
  };

  useEffect(() => {
    if (pathname === '/admin/login') {
      setAuthed(true);
      return;
    }
    const token = localStorage.getItem('prospectgrid_admin_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setAuthed(true);
  }, [pathname, router]);

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#F8FBFA' }}>
        <span className="loading-spinner w-8 h-8 border-[#2563EB]" />
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const workspaceConfig = getWorkspaceConfig();

  const handleLogout = () => {
    localStorage.removeItem('prospectgrid_admin_token');
    router.replace('/admin/login');
  };

  const pageTitle = pathname.startsWith('/admin/integrations/')
    ? 'Integration Detail'
    : PAGE_TITLES[pathname] || 'Admin';
  const segments = pathname.split('/').filter(Boolean);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--a-bg)' }}
      data-theme={theme}
      data-workspace="prospectgrid"
    >
      {/* mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:static z-50 inset-y-0 left-0 w-[286px]
          flex flex-col border-r
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: theme === 'light' ? '#ffffff' : 'var(--a-surface)',
          borderColor: 'var(--a-border)',
        }}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: 'var(--a-border)' }}>
          <Link href="/" className="flex items-center gap-3 group">
            <BrandMark workspace={workspaceConfig} />
            <div className="min-w-0">
              <p className="text-white font-semibold text-[15px] leading-tight truncate tracking-tight">
                {workspaceConfig.name}
              </p>
              <p
                className="text-[10px] leading-tight mt-1"
                style={{ color: 'var(--t-fg-35)', fontFamily: 'var(--t-mono-font)' }}
              >
                {workspaceConfig.tagline}
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p
                className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30"
                style={{ fontFamily: 'var(--t-mono-font)' }}
              >
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className="group relative flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors"
                      style={{
                        background: active ? (theme === 'light' ? '#0B132B' : 'var(--t-accent-soft)') : 'transparent',
                        color: active ? (theme === 'light' ? '#ffffff' : 'var(--t-accent)') : 'var(--t-fg-55)',
                        borderRadius: 'var(--t-radius-sm)',
                      }}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px]"
                          style={{ background: '#2563EB' }}
                        />
                      )}
                      <span
                        className="text-[9px] tracking-[0.1em] tabular-nums shrink-0"
                        style={{
                          fontFamily: 'var(--t-mono-font)',
                          color: active ? '#2563EB' : 'var(--t-fg-25)',
                          minWidth: 18,
                        }}
                      >
                        {link.ord}
                      </span>
                      <span className="h-4 w-4 shrink-0">{link.icon}</span>
                      <span className="flex-1 truncate transition-colors group-hover:opacity-100" style={{ opacity: active ? 1 : 0.82 }}>
                        {link.label}
                      </span>
                      {link.badge && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 uppercase tracking-wider"
                          style={{
                            background: 'var(--t-accent-soft)',
                            color: 'var(--t-accent)',
                            borderRadius: 'var(--t-radius-sm)',
                            fontFamily: 'var(--t-mono-font)',
                          }}
                        >
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-white/40 hover:text-white/80 transition-colors"
              style={{ borderRadius: 'var(--t-radius-sm)' }}
            >
              <span
                className="text-[9px] tracking-[0.1em] tabular-nums shrink-0"
                style={{ fontFamily: 'var(--t-mono-font)', minWidth: 18, color: 'var(--t-fg-25)' }}
              >
                ↗
              </span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M10 6H5a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M14 4h6v6M10 14L20 4" />
              </svg>
              <span>View live site</span>
            </a>
          </div>
        </nav>

        {/* Workspace footer */}
        <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: 'var(--a-border)' }}>
          <div
            className="w-full flex items-center gap-3 px-3 py-2 text-left"
            style={{ borderRadius: 'var(--t-radius-sm)' }}
          >
            <BrandMark workspace={workspaceConfig} />
            <div className="min-w-0 flex-1">
              <p className="text-white/80 text-xs font-medium truncate leading-tight">
                {workspaceConfig.shortName}
              </p>
              <p
                className="text-white/30 text-[9px] uppercase tracking-[0.2em] mt-0.5 leading-tight"
                style={{ fontFamily: 'var(--t-mono-font)' }}
              >
                Organization workspace
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-colors"
            style={{ borderRadius: 'var(--t-radius-sm)' }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M9 16l-4-4m0 0l4-4m-4 4h14M14 4h3a3 3 0 013 3v10a3 3 0 01-3 3h-3" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="h-16 border-b flex items-center px-4 sm:px-7 gap-4 shrink-0"
          style={{ background: theme === 'light' ? 'rgba(255,254,248,0.94)' : 'var(--a-surface)', borderColor: 'var(--a-border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/40 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 min-w-0" aria-label="Breadcrumb">
            <span
              className="text-[10px] uppercase tracking-[0.3em] hidden sm:inline"
              style={{ color: 'var(--t-fg-35)', fontFamily: 'var(--t-mono-font)' }}
            >
              {workspaceConfig.shortName}
            </span>
            <span className="text-white/20 hidden sm:inline">/</span>
            {segments.slice(0, -1).map((s, i) => (
              <span key={i} className="text-white/30 text-sm capitalize hidden md:inline">
                {s}
                <span className="text-white/15 mx-2">/</span>
              </span>
            ))}
            <span className="text-white text-sm font-medium tracking-tight truncate">
              {pageTitle}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Live pulse */}
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-1"
              style={{
                background: 'var(--t-accent-faint)',
                border: '1px solid var(--t-accent-soft)',
                borderRadius: 'var(--t-radius-sm)',
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="absolute inline-flex h-full w-full animate-ping opacity-60 rounded-full"
                  style={{ background: 'var(--t-accent)' }}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--t-accent)' }} />
              </span>
              <span
                className="text-[9px] font-semibold tracking-[0.25em] uppercase"
                style={{ color: 'var(--t-accent)', fontFamily: 'var(--t-mono-font)' }}
              >
                Synced
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="h-8 w-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
              style={{ borderRadius: 'var(--t-radius-sm)' }}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36-6.36l-.71.71M6.34 17.66l-.71.71M17.66 17.66l-.71-.71M6.34 6.34l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M20.35 15.35A9 9 0 018.65 3.65 9 9 0 0012 21a9 9 0 008.35-5.65z" />
                </svg>
              )}
            </button>

            {/* Workspace pill */}
            <div
              className="flex items-center gap-2 pl-3 pr-2 py-1.5 hover:bg-white/[0.04] transition-colors"
              style={{
                border: '1px solid var(--a-border2)',
                borderRadius: 'var(--t-radius-sm)',
              }}
            >
              <div className="text-right hidden sm:block">
                <p
                  className="text-white/40 text-[8px] uppercase tracking-[0.25em] leading-tight"
                  style={{ fontFamily: 'var(--t-mono-font)' }}
                >
                  Workspace
                </p>
                <p className="text-white text-[11px] font-semibold leading-tight">
                  {workspaceConfig.shortName}
                </p>
              </div>
              <BrandMark workspace={workspaceConfig} />
            </div>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto relative"
          style={{ background: 'var(--a-bg)' }}
        >
          <div className="relative px-4 sm:px-7 py-5 sm:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
