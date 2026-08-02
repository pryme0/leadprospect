'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getWorkspaceConfig } from '@/lib/workspace';
import { getSubscription, routeRequiresModule, FREE_ROUTES, type ModuleId } from '@/lib/subscription-store';
import { workingDaysRemaining } from '@/lib/subscription/trial';
import NotificationBell from '@/components/admin/NotificationBell';
import ConfirmModal from '@/components/admin/ConfirmModal';
import CommandPalette from '@/components/admin/CommandPalette';
import {
  Home, Radar, UserPlus, TrendingUp, MessagesSquare,
  Users, Blocks, CreditCard, Gift, Settings as SettingsIcon,
  Building2, UsersRound, Receipt, Inbox,
} from 'lucide-react';

const ICON = { size: 17, strokeWidth: 2 } as const;

/* Inactivity auto-logout: sign the user out after this much idle time, showing a
   countdown warning modal for the final WARNING window so they can stay. */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const IDLE_WARNING_MS = 30 * 1000;     // warn (with countdown) for the last 30s

/* ── Nav config ─────────────────────────────────────────────────────────────── */

type NavItem = {
  href: string;
  label: string;
  badge?: string;
  /** Extra routes that should keep this item highlighted (consolidated hubs). */
  match?: string[];
  icon: React.ReactNode;
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/admin',          label: 'Home',           icon: <Home {...ICON} /> },
      // Buyer Activity absorbs the old Signals / Explorer / Signal Ops pages.
      { href: '/admin/signals',  label: 'Buyer activity', icon: <Radar {...ICON} />,
        match: ['/admin/signals', '/admin/explore', '/admin/signal-ops'] },
      { href: '/admin/leads',    label: 'Leads',          icon: <UserPlus {...ICON} /> },
      { href: '/admin/pipeline', label: 'Deals',          icon: <TrendingUp {...ICON} /> },
      // Messages absorbs the old Pulse / Routing Desk / Email Desk pages.
      { href: '/admin/comms',    label: 'Messages',       icon: <MessagesSquare {...ICON} />,
        match: ['/admin/comms', '/admin/outreach', '/admin/email'] },
    ],
  },
  {
    title: 'Your account',
    items: [
      { href: '/admin/users',        label: 'Team',           icon: <Users {...ICON} /> },
      { href: '/admin/integrations', label: 'Connected apps', icon: <Blocks {...ICON} /> },
      { href: '/admin/subscription', label: 'Plan & billing', icon: <CreditCard {...ICON} /> },
      { href: '/admin/referrals',    label: 'Refer & earn',   icon: <Gift {...ICON} /> },
      { href: '/admin/settings',     label: 'Settings',       icon: <SettingsIcon {...ICON} /> },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin':             'Home',
  '/admin/pipeline':    'Deals',
  '/admin/explore':     'Buyer activity',
  '/admin/signal-ops':  'Buyer activity',
  '/admin/signals':     'Buyer activity',
  '/admin/leads':       'Leads',
  '/admin/outreach':    'Messages',
  '/admin/email':       'Messages',
  '/admin/comms':       'Messages',
  '/admin/users':       'Team',
  '/admin/integrations':'Connected apps',
  '/admin/settings':    'Settings',
  '/admin/subscription':'Plan & billing',
  '/admin/referrals':   'Refer & earn',
};

/* Consolidated hubs: the sub-pages we folded off the sidebar stay reachable via
   a plain sub-tab strip rendered once (in the layout) above the page content. */
const HUB_TABS: { match: string[]; tabs: { href: string; label: string }[] }[] = [
  {
    match: ['/admin/signals', '/admin/explore', '/admin/signal-ops'],
    tabs: [
      { href: '/admin/signals',    label: 'Recent' },
      { href: '/admin/explore',    label: 'Browse by type' },
      { href: '/admin/signal-ops', label: 'Work queue' },
    ],
  },
  {
    match: ['/admin/comms', '/admin/outreach', '/admin/email'],
    tabs: [
      { href: '/admin/comms',    label: 'Inbox' },
      { href: '/admin/outreach', label: 'Suggested replies' },
      { href: '/admin/email',    label: 'Emails' },
    ],
  },
];

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
  const [accessExpired,     setAccessExpired]     = useState(false);
  /** Active free-trial countdown: working days left + whether the plan is a trial. */
  const [trial,             setTrial]             = useState<{ daysLeft: number } | null>(null);
  const [newRequestCount,   setNewRequestCount]   = useState(0);
  const [unseenTxnCount,    setUnseenTxnCount]    = useState(0);
  const [themeMode,         setThemeMode]         = useState<'dark' | 'light'>('light');
  const [signoutConfirm,    setSignoutConfirm]    = useState(false);
  const [idleWarning,       setIdleWarning]       = useState(false);
  const [idleCountdown,     setIdleCountdown]     = useState(Math.round(IDLE_WARNING_MS / 1000));
  const idleWarningRef = useRef(false);
  useEffect(() => { idleWarningRef.current = idleWarning; }, [idleWarning]);

  /* Load saved theme — light is the default (calm, readable workspace for
     non-technical users); dark is opt-in and persisted via the header toggle. */
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
        .then((data: { modules?: ModuleId[]; expired?: boolean; active?: boolean; grantKind?: string | null; validUntil?: string | null } | null) => {
          if (data?.modules) setSubscribedModules(new Set(data.modules));
          setAccessExpired(!!data?.expired);
          // Active free trial → show a countdown of working days remaining.
          if (data?.active && data.grantKind === 'trial') {
            setTrial({ daysLeft: workingDaysRemaining(data.validUntil ?? null) });
          } else {
            setTrial(null);
          }
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

  /* Role-based section routing: super admins live in the platform console; org
     members can't enter it. */
  useEffect(() => {
    if (!authUser || pathname === '/admin/login') return;
    const isSuper = authUser.role === 'superadmin';
    const inPlatform = pathname.startsWith('/admin/platform');
    if (isSuper && !inPlatform) router.replace('/admin/platform');
    if (!isSuper && inPlatform) router.replace('/admin');
  }, [authUser, pathname, router]);

  /* Super-admin new-access-request count → the sidebar badge (the "new request"
     notification). Polls + refreshes when a request's status changes. */
  useEffect(() => {
    if (authUser?.role !== 'superadmin') return;
    const load = () => {
      const token = localStorage.getItem('synq_admin_token');
      if (!token) return;
      fetch('/api/super/access-requests', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { newCount?: number } | null) => { if (d) setNewRequestCount(d.newCount ?? 0); })
        .catch(() => {});
    };
    load();
    window.addEventListener('synq:access-requests-changed', load);
    const iv = setInterval(load, 30_000);
    return () => { window.removeEventListener('synq:access-requests-changed', load); clearInterval(iv); };
  }, [authUser]);

  /* Super-admin unseen-transaction count → the Transactions badge (the payment
     notification). Polls + clears when the transactions page marks them seen. */
  useEffect(() => {
    if (authUser?.role !== 'superadmin') return;
    const load = () => {
      const token = localStorage.getItem('synq_admin_token');
      if (!token) return;
      fetch('/api/super/transactions', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { unseenCount?: number } | null) => { if (d) setUnseenTxnCount(d.unseenCount ?? 0); })
        .catch(() => {});
    };
    load();
    window.addEventListener('synq:transactions-seen', load);
    const iv = setInterval(load, 30_000);
    return () => { window.removeEventListener('synq:transactions-seen', load); clearInterval(iv); };
  }, [authUser]);

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

  /* Super admins get a platform nav (working links) instead of the org sidebar,
     which for them only bounced back to the console. The Access Requests badge is
     the live new-request count — the super-admin "new request" notification. */
  const isSuper = authUser?.role === 'superadmin';
  const navToRender: { title: string; items: NavItem[] }[] = isSuper
    ? [{
        title: 'Platform',
        items: [
          { href: '/admin/platform',              label: 'Businesses',       icon: <Building2 {...ICON} /> },
          { href: '/admin/platform/leads',        label: 'All leads',        icon: <UsersRound {...ICON} /> },
          { href: '/admin/platform/transactions', label: 'Payments',         icon: <Receipt {...ICON} />,
            badge: unseenTxnCount > 0 ? String(unseenTxnCount) : undefined },
          { href: '/admin/platform/requests',     label: 'Sign-up requests', icon: <Inbox {...ICON} />,
            badge: newRequestCount > 0 ? String(newRequestCount) : undefined },
        ],
      }]
    : navGroups;

  const workspace = getWorkspaceConfig();
  // Sidebar/header display name prefers the saved organization name.
  const displayName = orgName || authUser?.name || workspace.shortName;
  const displayInitials = (orgName || authUser?.name)
    ? (orgName || authUser!.name).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : workspace.initials;

  const pageTitle = pathname.startsWith('/admin/integrations/')
    ? 'Connected apps'
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
          {navToRender.map((group) => (
            <div key={group.title}>
              {/* Group label (expanded) → thin divider (collapsed, desktop) */}
              <p className={`mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20 ${collapsed ? 'lg:hidden' : ''}`}>
                {group.title}
              </p>
              {collapsed && <div className="mx-2 mb-1.5 hidden lg:block border-t border-white/[0.06]" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  // Home matches exactly; hubs highlight for any of their routes;
                  // everything else highlights on itself + nested detail pages.
                  const matchList = item.match ?? [item.href];
                  const active = item.href === '/admin'
                    ? pathname === '/admin'
                    : matchList.some((m) => pathname === m || pathname.startsWith(m + '/'));
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
            {/* Access-expired lockout — data stays viewable (read-only); crawling
                and all features are off until the org subscribes/renews. */}
            {accessExpired && pathname !== '/admin/subscription' && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                   style={{ background: 'rgba(255,86,86,0.08)', borderColor: 'rgba(255,86,86,0.35)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-[#ff7a7a]">lock_clock</span>
                  <p className="text-[13px] text-white/85">
                    Your plan has ended — finding new customers is paused. Your existing data is still here to view. Renew to start again.
                  </p>
                </div>
                <a href="/admin/subscription" className="rounded-lg bg-[#6D5EF9] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-[#5B4FE8]">
                  Subscribe to continue
                </a>
              </div>
            )}
            {/* Free-trial countdown — shown while an active trial is running. Turns
                amber → red as it winds down so it reads as an escalating nudge.
                Once the trial expires it becomes the access-expired banner above. */}
            {!accessExpired && trial && pathname !== '/admin/subscription' && (
              (() => {
                const urgent = trial.daysLeft <= 2;
                const accent = urgent ? '255,122,122' : '255,181,71'; // red vs amber
                const label = trial.daysLeft <= 0
                  ? 'Your free trial ends today'
                  : trial.daysLeft === 1
                    ? 'Last day of your free trial'
                    : `${trial.daysLeft} days left in your free trial`;
                return (
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                       style={{ background: `rgba(${accent},0.09)`, borderColor: `rgba(${accent},0.35)` }}>
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[20px]" style={{ color: `rgb(${accent})` }}>timer</span>
                      <p className="text-[13px] text-white/85">
                        <span className="font-semibold" style={{ color: `rgb(${accent})` }}>{label}.</span>{' '}
                        Subscribe to keep finding new customers and using every feature.
                      </p>
                    </div>
                    <a href="/admin/subscription" className="rounded-lg bg-[#6D5EF9] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-[#5B4FE8]">
                      Subscribe now
                    </a>
                  </div>
                );
              })()
            )}

            {/* Hub sub-tabs (Buyer activity / Messages) — keeps the folded-in
                pages reachable with one obvious place to switch views. */}
            {(() => {
              const hub = HUB_TABS.find((h) => h.match.some((m) => pathname === m || pathname.startsWith(m + '/')));
              if (!hub) return null;
              return (
                <div className="mb-5 flex flex-wrap gap-1.5 border-b pb-px" style={{ borderColor: 'var(--a-border)' }}>
                  {hub.tabs.map((t) => {
                    const on = pathname === t.href || pathname.startsWith(t.href + '/');
                    return (
                      <Link
                        key={t.href}
                        href={t.href}
                        className="relative rounded-t-lg px-3.5 py-2 text-[13.5px] font-semibold transition-colors"
                        style={on
                          ? { color: 'var(--t-accent, #6D5EF9)' }
                          : { color: 'var(--a-text-50)' }}
                      >
                        {t.label}
                        {on && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full" style={{ background: 'var(--t-accent, #6D5EF9)' }} />}
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
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
      <CommandPalette />
    </div>
  );
}
