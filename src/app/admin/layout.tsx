'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceConfig } from '@/lib/workspace';

/* ── Nav config ─────────────────────────────────────────────────────────────── */

const navGroups = [
  {
    title: 'Workbench',
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        badge: undefined as string | undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z" />
          </svg>
        ),
      },
      {
        href: '/admin/pipeline',
        label: 'Pipeline',
        badge: 'Live',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M13.5 4.938a7 7 0 11-9.006 1.737c.202-.257.59-.218.793.039.278.352.594.672.943.954.332.269.786-.049.773-.476a5.977 5.977 0 01.572-2.759 6.026 6.026 0 012.486-2.665c.247-.14.55-.016.677.238A6.967 6.967 0 0013.5 4.938zM14 12a4 4 0 01-4 4c-1.913 0-3.52-1.398-3.91-3.182-.093-.429.44-.643.814-.413a4.043 4.043 0 001.601.564c.303.038.531-.24.51-.544a5.975 5.975 0 011.315-4.192.447.447 0 01.431-.16A4.001 4.001 0 0114 12z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: '/admin/explore',
        label: 'Explorer',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        href: '/admin/signals',
        label: 'Signals',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
          </svg>
        ),
      },
      {
        href: '/admin/leads',
        label: 'Lead Queue',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
          </svg>
        ),
      },
      {
        href: '/admin/outreach',
        label: 'Routing Desk',
        badge: 'New',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.114A28.897 28.897 0 003.105 2.289z" />
          </svg>
        ),
      },
      {
        href: '/admin/email',
        label: 'Email Desk',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
            <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      {
        href: '/admin/users',
        label: 'Team',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
          </svg>
        ),
      },
      {
        href: '/admin/integrations',
        label: 'Integrations',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
            <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
          </svg>
        ),
      },
      {
        href: '/admin/settings',
        label: 'Settings',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l1.67 1.67a1 1 0 01.124 1.262l-.833 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 01.804.98v2.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.833 1.25a1 1 0 01-.124 1.262l-1.67 1.67a1 1 0 01-1.262.124l-1.25-.833a6.953 6.953 0 01-1.416.587l-.294 1.473a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.833a1 1 0 01-1.262-.124l-1.67-1.67a1 1 0 01-.124-1.262l.833-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.294A1 1 0 011 11.18V8.82a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.833-1.25a1 1 0 01.124-1.262l1.67-1.67a1 1 0 011.262-.124l1.25.833a6.957 6.957 0 011.416-.587l.294-1.473zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        ),
      },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin':             'Dashboard',
  '/admin/pipeline':    'Pipeline',
  '/admin/explore':     'Explorer',
  '/admin/signals':     'Signals',
  '/admin/leads':       'Lead Queue',
  '/admin/outreach':    'Routing Desk',
  '/admin/email':       'Email Desk',
  '/admin/users':       'Team',
  '/admin/integrations':'Integrations',
  '/admin/settings':    'Settings',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed]           = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') { setAuthed(true); return; }
    const token = localStorage.getItem('prospectgrid_admin_token');
    if (!token) { router.replace('/admin/login'); return; }
    setAuthed(true);
  }, [pathname, router]);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080D1A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#2563EB]" />
      </div>
    );
  }

  if (pathname === '/admin/login') return <>{children}</>;

  const workspace = getWorkspaceConfig();

  const handleLogout = () => {
    localStorage.removeItem('prospectgrid_admin_token');
    router.replace('/admin/login');
  };

  const pageTitle = pathname.startsWith('/admin/integrations/')
    ? 'Integration Detail'
    : PAGE_TITLES[pathname] ?? 'Admin';

  return (
    <div className="flex h-screen overflow-hidden bg-[#080D1A]" data-theme="dark" data-workspace="prospectgrid">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex w-[240px] flex-col
          border-r border-white/[0.05] bg-[#0A0F1E]
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="flex h-[58px] shrink-0 items-center gap-3 border-b border-white/[0.05] px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-[11px] font-extrabold tracking-tight text-white">
              PG
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-white tracking-tight">ProspectGrid</p>
              <p className="text-[10px] leading-tight text-white/30">Lead Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                        active
                          ? 'bg-[#2563EB]/10 text-[#2563EB]'
                          : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-[20%] h-[60%] w-[2px] rounded-full bg-[#2563EB]" />
                      )}
                      <span className={`shrink-0 transition-colors ${active ? 'text-[#2563EB]' : ''}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          item.badge === 'Live'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-[#2563EB]/15 text-[#2563EB]'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* External link */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/30 transition-all duration-150 hover:bg-white/[0.04] hover:text-white/60"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
            </svg>
            <span>Live site</span>
          </a>
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-white/[0.05] p-3">
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[11px] font-bold text-white/60">
              {workspace.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight text-white/70">{workspace.shortName}</p>
              <p className="text-[10px] leading-tight text-white/25">Workspace</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/30 transition-all duration-150 hover:bg-red-500/[0.07] hover:text-red-400"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex h-[58px] shrink-0 items-center gap-4 border-b border-white/[0.05] bg-[#080D1A]/90 px-5 backdrop-blur-xl">
          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page title */}
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold text-white">{pageTitle}</h1>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Live indicator */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Synced</span>
            </div>

            {/* Workspace badge */}
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#2563EB] text-[9px] font-bold text-white">
                {workspace.initials}
              </div>
              <span className="text-[12px] font-medium text-white/60">{workspace.shortName}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="relative flex-1 overflow-y-auto bg-[#080D1A]">
          <div className="mx-auto max-w-[1480px] px-5 py-6 sm:px-7 sm:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
