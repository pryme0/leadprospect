'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getWorkspaceConfig } from '@/lib/workspace';
import { getSubscription, routeRequiresModule, FREE_ROUTES, type ModuleId } from '@/lib/subscription-store';
import NotificationBell from '@/components/admin/NotificationBell';
import ConfirmModal from '@/components/admin/ConfirmModal';

/* Inactivity auto-logout: sign the user out after this much idle time, showing a
   countdown warning modal for the final WARNING window so they can stay. */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const IDLE_WARNING_MS = 30 * 1000;     // warn (with countdown) for the last 30s

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
            <path d="M4.5 3A1.5 1.5 0 003 4.5v3A1.5 1.5 0 004.5 9h3A1.5 1.5 0 009 7.5v-3A1.5 1.5 0 007.5 3h-3zm0 8A1.5 1.5 0 003 12.5v3A1.5 1.5 0 004.5 17h3A1.5 1.5 0 009 15.5v-3A1.5 1.5 0 007.5 11h-3zm8-8A1.5 1.5 0 0011 4.5v3A1.5 1.5 0 0012.5 9h3A1.5 1.5 0 0017 7.5v-3A1.5 1.5 0 0015.5 3h-3zm0 8a1.5 1.5 0 00-1.5 1.5v3a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5h-3z" />
          </svg>
        ),
      },
      {
        href: '/admin/pipeline',
        label: 'Pipeline',
        badge: 'Live',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
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
            <path d="M10 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            <path fillRule="evenodd" d="M6.343 4.929a.75.75 0 010 1.06 5.5 5.5 0 000 7.779.75.75 0 11-1.06 1.06 7 7 0 010-9.899.75.75 0 011.06 0zm7.314 0a.75.75 0 011.06 0 7 7 0 010 9.9.75.75 0 11-1.06-1.061 5.5 5.5 0 000-7.778.75.75 0 010-1.06zM4.222 2.808a.75.75 0 010 1.06 8.5 8.5 0 000 12.021.75.75 0 01-1.06 1.061c-3.905-3.905-3.905-10.237 0-14.142a.75.75 0 011.06 0zm11.556 0a.75.75 0 011.06 0c3.905 3.905 3.905 10.237 0 14.142a.75.75 0 11-1.06-1.06 8.5 8.5 0 000-12.022.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        href: '/admin/leads',
        label: 'Lead Queue',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 5a3 3 0 11-6 0 3 3 0 016 0zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM16.25 5.75a.75.75 0 00-1.5 0v2h-2a.75.75 0 000 1.5h2v2a.75.75 0 001.5 0v-2h2a.75.75 0 000-1.5h-2v-2z" />
          </svg>
        ),
      },
      {
        href: '/admin/outreach',
        label: 'Routing Desk',
        badge: 'New',
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.475l6.733-3.366A2.52 2.52 0 0113 4.5z" />
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
      {
        href: '/admin/comms',
        label: 'Pulse',
        badge: 'New' as string | undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 9.052V10.5c0 .848.223 1.664.626 2.372A41.369 41.369 0 019 13a41.369 41.369 0 01-5.495-.365c-1.247-.167-2.18-1.108-2.435-2.268A4.45 4.45 0 001.647 11H1.5A1.5 1.5 0 010 9.5V8.5A1.5 1.5 0 011.5 7h.147c.255-1.16 1.188-2.1 2.435-2.268A41.553 41.553 0 019 4.5c1.863 0 3.697.124 5.495.365" />
            <path d="M7.5 9.052c0-2.006 1.608-3.657 3.684-3.79A43.141 43.141 0 0115.5 5c.223 0 .445.005.666.015C18.006 5.157 19.5 6.927 19.5 9.052V10.5A1.5 1.5 0 0118 12h-.147c-.268 1.16-1.2 2.1-2.435 2.268A41.369 41.369 0 0111 14.5c-1.863 0-3.697-.124-5.495-.365A43.14 43.14 0 015.5 14H5a.5.5 0 00-.354.146l-1.5 1.5A.5.5 0 012.5 16v-1.667c-.82-.186-1.5-.852-1.5-1.833V11a1.5 1.5 0 011.5-1.5h.147" />
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
      {
        href: '/admin/subscription',
        label: 'Subscription',
        badge: undefined,
        icon: (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M2.5 4A1.5 1.5 0 001 5.5V6h18v-.5A1.5 1.5 0 0017.5 4h-15z" />
            <path fillRule="evenodd" d="M19 8.5H1v6A1.5 1.5 0 002.5 16h15a1.5 1.5 0 001.5-1.5v-6zM3 13.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm4.75-.75a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
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
  '/admin/comms':       'Pulse',
  '/admin/users':       'Team',
  '/admin/integrations':'Integrations',
  '/admin/settings':    'Settings',
  '/admin/subscription':'Subscription',
};

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [authed,            setAuthed]            = useState(false);
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [collapsed,         setCollapsed]         = useState(false);
  const [authUser,          setAuthUser]          = useState<AuthUser | null>(null);
  const [subscribedModules, setSubscribedModules] = useState<Set<ModuleId>>(new Set());
  const [themeMode,         setThemeMode]         = useState<'dark' | 'light'>('light');
  const [signoutConfirm,    setSignoutConfirm]    = useState(false);
  const [idleWarning,       setIdleWarning]       = useState(false);
  const [idleCountdown,     setIdleCountdown]     = useState(Math.round(IDLE_WARNING_MS / 1000));
  const idleWarningRef = useRef(false);
  useEffect(() => { idleWarningRef.current = idleWarning; }, [idleWarning]);

  /* Load saved theme — light is the default, dark is opt-in and persisted */
  useEffect(() => {
    const saved = localStorage.getItem('synq_theme') as 'dark' | 'light' | null;
    if (saved === 'dark') setThemeMode('dark');
    if (localStorage.getItem('synq_sidebar_collapsed') === 'true') setCollapsed(true);
  }, []);

  /* Desktop-only sidebar collapse (mobile always uses the slide-in drawer). */
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('synq_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('synq_theme', next);
      return next;
    });
  };

  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  /* Sidebar name + logo = the organization profile (persisted). Re-runs on
     navigation (so it picks up the token after login) and on settings save. */
  useEffect(() => {
    const loadOrgName = () => {
      const token = localStorage.getItem('synq_admin_token');
      if (!token) return;
      fetch('/api/settings/org', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          const n = res?.profile?.company_name;
          setOrgName(typeof n === 'string' && n.trim() ? n.trim() : null);
          const l = res?.profile?.logo_url;
          setOrgLogo(typeof l === 'string' && l.trim() ? l.trim() : null);
        })
        .catch(() => {});
    };
    loadOrgName();
    window.addEventListener('synq:org-changed', loadOrgName);
    return () => window.removeEventListener('synq:org-changed', loadOrgName);
  }, [pathname]);

  /* Subscription entitlement drives the sidebar lock state. The SHARED server
     (Postgres) is the source of truth; localStorage is only a fast-paint cache
     (kept per-browser). We paint from the cache, then reconcile with the server. */
  useEffect(() => {
    const load = () => {
      // Fast paint from the local cache.
      const cached = getSubscription();
      if (cached?.modules) setSubscribedModules(new Set(cached.modules as ModuleId[]));
      // Authoritative read from the shared store.
      const token = localStorage.getItem('synq_admin_token');
      if (!token) return;
      fetch('/api/subscription/sync', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { modules?: ModuleId[] } | null) => {
          if (data?.modules) setSubscribedModules(new Set(data.modules));
        })
        .catch(() => {});
    };
    load();
    window.addEventListener('synq:subscription-changed', load);
    return () => window.removeEventListener('synq:subscription-changed', load);
  }, []);

  useEffect(() => {
    if (pathname === '/admin/login') { setAuthed(true); return; }
    const token = localStorage.getItem('synq_admin_token');
    if (!token) { router.replace('/admin/login'); return; }

    /* Fast render from cached user, then validate with server */
    const cached = localStorage.getItem('synq_admin_user');
    if (cached) {
      try { setAuthUser(JSON.parse(cached)); } catch {}
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) {
          localStorage.removeItem('synq_admin_token');
          localStorage.removeItem('synq_admin_user');
          router.replace('/admin/login');
          return;
        }
        return r.json();
      })
      .then((user: AuthUser | undefined) => {
        if (user) {
          setAuthUser(user);
          localStorage.setItem('synq_admin_user', JSON.stringify(user));
        }
        setAuthed(true);
      })
      .catch(() => setAuthed(true));
  }, [pathname, router]);

  /* Single logout path — used by the sign-out confirm modal and the idle timer. */
  const doLogout = useCallback(() => {
    localStorage.removeItem('synq_admin_token');
    localStorage.removeItem('synq_admin_user');
    router.replace('/admin/login');
  }, [router]);

  /* Controls for the idle-warning modal buttons (set by the effect below). */
  const idleCtl = useRef<{ stay: () => void; logoutNow: () => void }>({ stay: () => {}, logoutNow: () => {} });

  /* Inactivity auto-logout. Arms a timer that, after IDLE_TIMEOUT - WARNING of
     no user activity, opens a countdown modal; if the countdown reaches zero the
     user is logged out. Any activity BEFORE the warning resets the timer; once
     the warning shows, the user must explicitly choose "Stay signed in". */
  useEffect(() => {
    if (!authed || pathname === '/admin/login') return;

    let armId: ReturnType<typeof setTimeout>;
    let tickId: ReturnType<typeof setInterval>;
    const clearAll = () => { clearTimeout(armId); clearInterval(tickId); };

    const logout = () => { clearAll(); doLogout(); };

    const startCountdown = () => {
      let remaining = Math.round(IDLE_WARNING_MS / 1000);
      setIdleCountdown(remaining);
      setIdleWarning(true);
      idleWarningRef.current = true;
      tickId = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) { logout(); return; }
        setIdleCountdown(remaining);
      }, 1000);
    };

    const arm = () => { armId = setTimeout(startCountdown, IDLE_TIMEOUT_MS - IDLE_WARNING_MS); };

    const onActivity = () => {
      if (idleWarningRef.current) return; // during the warning, ignore activity — require an explicit choice
      clearTimeout(armId);
      arm();
    };

    idleCtl.current = {
      stay: () => {
        clearInterval(tickId);
        setIdleWarning(false);
        idleWarningRef.current = false;
        clearTimeout(armId);
        arm();
      },
      logoutNow: logout,
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    arm();

    return () => {
      clearAll();
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [authed, pathname, doLogout]);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080D1A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#6D5EF9]" />
      </div>
    );
  }

  if (pathname === '/admin/login') return <>{children}</>;

  const workspace = getWorkspaceConfig();
  // Sidebar/header display name prefers the saved organization name.
  const displayName = orgName || authUser?.name || workspace.shortName;
  const displayInitials = (orgName || authUser?.name)
    ? (orgName || authUser!.name).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : workspace.initials;

  const pageTitle = pathname.startsWith('/admin/integrations/')
    ? 'Integration Detail'
    : PAGE_TITLES[pathname] ?? 'Admin';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--a-bg)' }} data-theme={themeMode} data-workspace="synq">

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
          transition-[transform,width] duration-300 ease-out
          ${collapsed ? 'lg:w-[68px]' : 'lg:w-[240px]'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className={`flex h-[58px] shrink-0 items-center border-b border-white/[0.05] ${collapsed ? 'lg:justify-center lg:px-2' : ''} px-4`}>
          {/* Wordmark (expanded) */}
          <Link href="/" className={`flex items-center group ${collapsed ? 'lg:hidden' : ''}`}>
            <Image
              src="/synq-logo.png"
              alt="SYNQ"
              width={124}
              height={44}
              className="h-[36px] w-auto object-contain"
              priority
            />
          </Link>
          {/* Compact mark (collapsed, desktop only) */}
          <Link
            href="/"
            className={`hidden ${collapsed ? 'lg:flex' : ''} h-8 w-8 items-center justify-center rounded-lg text-[13px] font-black text-white`}
            style={{ background: 'linear-gradient(135deg, #6D5EF9, #18D8FF)' }}
            title="SYNQ"
          >
            S
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              {/* Group label (expanded) → thin divider (collapsed, desktop) */}
              <p className={`mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20 ${collapsed ? 'lg:hidden' : ''}`}>
                {group.title}
              </p>
              {collapsed && <div className="mx-2 mb-1.5 hidden lg:block border-t border-white/[0.06]" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active     = pathname === item.href;
                  const reqModule  = routeRequiresModule(item.href);
                  const isFree     = FREE_ROUTES.includes(item.href);
                  const isLocked   = !isFree && reqModule !== null && !subscribedModules.has(reqModule);

                  if (isLocked) {
                    return (
                      <Link
                        key={item.href}
                        href="/admin/subscription"
                        onClick={() => setSidebarOpen(false)}
                        title={collapsed ? `${item.label} — subscribe to unlock` : `Subscribe to unlock ${item.label}`}
                        className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/20 transition-all duration-150 hover:bg-white/[0.03] hover:text-white/30 ${collapsed ? 'lg:justify-center' : ''}`}
                      >
                        <span className="shrink-0 opacity-40">{item.icon}</span>
                        <span className={`flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                        <svg viewBox="0 0 16 16" fill="none" className={`h-3 w-3 shrink-0 text-white/20 ${collapsed ? 'lg:hidden' : ''}`}>
                          <path d="M5 7V5a3 3 0 016 0v2M4 7h8a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${collapsed ? 'lg:justify-center' : ''} ${
                        active
                          ? 'bg-[#6D5EF9]/10 text-[#6D5EF9]'
                          : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-[20%] h-[60%] w-[2px] rounded-full bg-[#6D5EF9]" />
                      )}
                      <span className={`relative shrink-0 transition-colors ${active ? 'text-[#6D5EF9]' : ''}`}>
                        {item.icon}
                        {/* Collapsed: badge becomes a small dot on the icon */}
                        {item.badge && (
                          <span className={`absolute -right-1 -top-1 hidden h-1.5 w-1.5 rounded-full ${collapsed ? 'lg:block' : ''} ${item.badge === 'Live' ? 'bg-emerald-400' : 'bg-[#6D5EF9]'}`} />
                        )}
                      </span>
                      <span className={`flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {item.badge && (
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${collapsed ? 'lg:hidden' : ''} ${
                          item.badge === 'Live'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-[#6D5EF9]/15 text-[#6D5EF9]'
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
            title={collapsed ? 'Live site' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/30 transition-all duration-150 hover:bg-white/[0.04] hover:text-white/60 ${collapsed ? 'lg:justify-center' : ''}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
            </svg>
            <span className={collapsed ? 'lg:hidden' : ''}>Live site</span>
          </a>
        </nav>

        {/* Collapse toggle (desktop only — mobile uses the drawer) */}
        <div className="hidden shrink-0 border-t border-white/[0.05] px-2.5 py-2 lg:block">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/30 transition-all duration-150 hover:bg-white/[0.04] hover:text-white/70 ${collapsed ? 'justify-center' : ''}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            <span className={collapsed ? 'hidden' : ''}>Collapse</span>
          </button>
        </div>

        {/* User footer */}
        <div className="shrink-0 border-t border-white/[0.05] p-3">
          <div className={`mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            {orgLogo ? (
              <img src={orgLogo} alt={displayName} title={collapsed ? displayName : undefined}
                className="h-7 w-7 shrink-0 rounded-lg border border-white/10 object-cover"
                onError={() => setOrgLogo(null)} />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#6D5EF9]/15 text-[11px] font-bold text-[#6D5EF9]" title={collapsed ? displayName : undefined}>
                {displayInitials}
              </div>
            )}
            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-[12px] font-semibold leading-tight text-white/70">{displayName}</p>
              <p className="truncate text-[10px] leading-tight text-white/25">{authUser?.email ?? 'Workspace'}</p>
            </div>
          </div>
          <button
            onClick={() => setSignoutConfirm(true)}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/30 transition-all duration-150 hover:bg-red-500/[0.07] hover:text-red-400 ${collapsed ? 'lg:justify-center' : ''}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
            </svg>
            <span className={collapsed ? 'lg:hidden' : ''}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="relative z-40 flex h-[58px] shrink-0 items-center gap-4 border-b border-white/[0.05] bg-[#080D1A]/90 px-5 backdrop-blur-xl">
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
            {/* Notifications */}
            <NotificationBell />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-lg p-2 transition-all hover:bg-white/[0.06]"
              aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {themeMode === 'dark' ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white/40">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#6D5EF9]">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Live indicator */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Synced</span>
            </div>

            {/* Workspace badge */}
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 sm:px-3">
              {orgLogo ? (
                <img src={orgLogo} alt={displayName} className="h-5 w-5 rounded-md object-cover" onError={() => setOrgLogo(null)} />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #6D5EF9, #18D8FF)' }}>
                  {displayInitials}
                </div>
              )}
              <span className="hidden max-w-[140px] truncate text-[12px] font-medium text-white/60 sm:inline">{displayName}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="relative flex-1 overflow-y-auto" style={{ background: 'var(--a-bg)' }}>
          <div className="mx-auto max-w-[1480px] px-5 py-6 sm:px-7 sm:py-7">
            {children}
          </div>
        </main>
      </div>

      {/* Sign-out confirmation */}
      <ConfirmModal
        open={signoutConfirm}
        tone="danger"
        title="Sign out?"
        message="You'll need to log in again to access your workspace."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={() => { setSignoutConfirm(false); doLogout(); }}
        onCancel={() => setSignoutConfirm(false)}
      />

      {/* Inactivity auto-logout warning */}
      <ConfirmModal
        open={idleWarning}
        tone="default"
        title="Still there?"
        message={
          <>You&apos;ve been inactive. For your security you&apos;ll be signed out in{' '}
            <span className="font-bold" style={{ color: 'var(--a-text)' }}>{idleCountdown}s</span>.
          </>
        }
        confirmLabel="Stay signed in"
        cancelLabel="Sign out now"
        onConfirm={() => idleCtl.current.stay()}
        onCancel={() => idleCtl.current.logoutNow()}
      />
    </div>
  );
}
