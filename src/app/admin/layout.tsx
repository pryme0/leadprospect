'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  TenantId,
  TenantConfig,
  getCurrentTenant,
  getTenantConfig,
  clearCurrentTenant,
} from '@/lib/tenant';

const sidebarLinks = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/admin/pipeline',
    label: 'Pipeline',
    badge: 'Live',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: '/admin/explore',
    label: 'Explore',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
  {
    href: '/admin/signals',
    label: 'Signals',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/admin/leads',
    label: 'Leads',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/outreach',
    label: 'Outreach',
    badge: 'New',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// Tenant logo block. Falls back to a circular initials wordmark when the
// tenant has no logo file (e.g. Lightforth's placeholder until a real asset
// is provided).
function BrandMark({ tenant }: { tenant: TenantConfig }) {
  if (tenant.logoSrc) {
    return (
      <img
        src={tenant.logoSrc}
        alt={`${tenant.name} logo`}
        className="w-8 h-8 object-contain shrink-0"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0"
      style={
        tenant.id === 'LIGHTFORTH'
          ? { background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }
          : { background: 'rgba(11,170,239,0.15)', color: '#0BAAEF' }
      }
    >
      {tenant.initials}
    </div>
  );
}

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/pipeline': 'Signal Pipeline',
  '/admin/explore': 'Explore Signals',
  '/admin/signals': 'Signals',
  '/admin/leads': 'Leads',
  '/admin/outreach': 'Outreach',
  '/admin/users': 'Users',
  '/admin/settings': 'Settings',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [tenant, setTenant] = useState<TenantId | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('emc_theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('emc_theme', next);
  };

  useEffect(() => {
    if (pathname === '/admin/login') {
      setAuthed(true);
      return;
    }
    const token = localStorage.getItem('emc_admin_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setAuthed(true);

    // Tenant gate. Anyone authed but without a tenant gets bounced to the
    // picker (except when they're already on it). This keeps every admin
    // page rendering against a known workspace.
    const t = getCurrentTenant();
    setTenant(t);
    if (!t && pathname !== '/admin/tenant-select') {
      router.replace('/admin/tenant-select');
    }
  }, [pathname, router]);

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-darker">
        <span className="loading-spinner w-8 h-8 border-[#0BAAEF]" />
      </div>
    );
  }

  if (pathname === '/admin/login' || pathname === '/admin/tenant-select') {
    // Login + tenant picker render full-bleed without the sidebar/topbar chrome.
    return <>{children}</>;
  }

  // Below this point we're rendering the dashboard chrome — guaranteed authed
  // AND tenant-selected. (The redirect above handles the missing-tenant case.)
  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-darker">
        <span className="loading-spinner w-8 h-8 border-[#0BAAEF]" />
      </div>
    );
  }

  const tenantConfig = getTenantConfig(tenant);
  const tenantAttr = tenant.toLowerCase();

  const handleLogout = () => {
    localStorage.removeItem('emc_admin_token');
    clearCurrentTenant();
    router.replace('/admin/login');
  };

  const handleSwitchTenant = () => {
    clearCurrentTenant();
    router.replace('/admin/tenant-select');
  };

  const pageTitle = PAGE_TITLES[pathname] || 'Admin';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--a-bg)' }} data-theme={theme} data-tenant={tenantAttr}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:static z-50 inset-y-0 left-0 w-60
          border-r
          flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)' }}
      >
        {/* Logo / Brand — tenant-aware */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--a-border)' }}>
          <Link href="/" className="flex items-center gap-3 group">
            <BrandMark tenant={tenantConfig} />
            <div>
              <p className="text-white font-bold text-sm leading-tight">{tenantConfig.name}</p>
              <p className="text-white/30 text-[10px] leading-tight">{tenantConfig.tagline}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest px-3 pt-2 pb-1.5">
            Navigation
          </p>

          {sidebarLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={active ? {
                  background: 'rgba(11,170,239,0.1)',
                  color: '#0BAAEF',
                  fontWeight: 500,
                } : {}}
              >
                <span style={{ color: active ? '#0BAAEF' : 'rgba(255,255,255,0.3)' }}>
                  {link.icon}
                </span>
                <span className={`flex-1 ${!active ? 'text-white/40 hover:text-white/80' : ''}`}>{link.label}</span>
                {link.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                    style={{ background: 'rgba(11,170,239,0.2)', color: '#0BAAEF', borderColor: 'rgba(11,170,239,0.3)' }}>
                    {link.badge}
                  </span>
                )}
                {active && (
                  <span className="w-1 h-4 rounded-full" style={{ background: '#0BAAEF' }} />
                )}
              </Link>
            );
          })}

          <div className="pt-4">
            <p className="text-white/25 text-[10px] font-semibold uppercase tracking-widest px-3 pb-1.5">
              Quick Links
            </p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
            >
              <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Live Site
            </a>
          </div>
        </nav>

        {/* Bottom — workspace + logout */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: 'var(--a-border)' }}>
          <button
            onClick={handleSwitchTenant}
            title="Switch workspace"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 hover:bg-white/5 transition-colors w-full text-left"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={
                tenant === 'LIGHTFORTH'
                  ? { background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                  : { background: 'linear-gradient(135deg, rgba(11,170,239,0.4), rgba(64,196,255,0.4))', color: '#0BAAEF' }
              }
            >
              {tenantConfig.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/80 text-xs font-medium truncate">{tenantConfig.name}</p>
              <p className="text-white/30 text-[10px] truncate">Switch workspace</p>
            </div>
            <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-400/10 w-full transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 backdrop-blur-sm border-b flex items-center px-6 gap-4 shrink-0" style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)' }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2">
            <span className="text-white/20 text-sm">Admin</span>
            <span className="text-white/20">/</span>
            <span className="text-white/80 text-sm font-medium">{pageTitle}</span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 border border-white/5 transition-all"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
              style={{ background: 'rgba(11,170,239,0.1)', borderColor: 'rgba(11,170,239,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0BAAEF' }} />
              <span className="text-[10px] font-semibold" style={{ color: '#0BAAEF' }}>LIVE</span>
            </div>

            {/* Current tenant + switcher */}
            <button
              onClick={handleSwitchTenant}
              title="Switch workspace"
              className="flex items-center gap-2 pl-3 border-l hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--a-border2)' }}
            >
              <div className="text-right hidden sm:block">
                <p className="text-white/50 text-[10px] leading-tight">Workspace</p>
                <p className="text-white/80 text-xs font-semibold leading-tight">{tenantConfig.shortName}</p>
              </div>
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-[10px]"
                style={
                  tenant === 'LIGHTFORTH'
                    ? { background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                    : { background: 'linear-gradient(135deg, #0BAAEF, #40C4FF)', color: '#080f17' }
                }
              >
                {tenantConfig.initials}
              </div>
              <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
