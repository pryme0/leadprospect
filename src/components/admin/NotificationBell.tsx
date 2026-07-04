'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: 'mention' | 'message';
  title: string;
  body: string;
  platform: string;
  ts: number;
  time: string;
  href: string;
}

const SEEN_KEY = 'synq_comms_notif_seen';
const POLL_MS = 15_000;

function getLastSeen(): number {
  if (typeof window === 'undefined') return 0;
  const raw = Number(localStorage.getItem(SEEN_KEY) ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hydrate the watermark on mount (localStorage is client-only).
  useEffect(() => { setLastSeen(getLastSeen()); }, []);

  const load = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
    fetch('/api/comms/notifications', {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { notifications?: NotificationItem[] }) => {
        if (Array.isArray(data.notifications)) setItems(data.notifications);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const unreadCount = useMemo(
    () => items.filter((n) => n.ts > lastSeen).length,
    [items, lastSeen],
  );

  const markAllSeen = useCallback(() => {
    const newest = items.reduce((max, n) => Math.max(max, n.ts), lastSeen);
    localStorage.setItem(SEEN_KEY, String(newest));
    setLastSeen(newest);
  }, [items, lastSeen]);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) markAllSeen(); // opening the panel clears the badge
      return next;
    });
  };

  const openItem = (n: NotificationItem) => {
    setOpen(false);
    markAllSeen();
    router.push(n.href);
  };

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className="relative flex items-center justify-center rounded-lg p-2 transition-all hover:bg-white/[0.06]"
        aria-label="Notifications"
        title="Notifications"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white/40">
          <path d="M10 2a5 5 0 00-5 5v2.6c0 .48-.19.94-.53 1.28l-.94.94A1 1 0 004.24 13.5h11.52a1 1 0 00.71-1.68l-.94-.94A1.81 1.81 0 0115 9.6V7a5 5 0 00-5-5z" />
          <path d="M8.1 15.5a2 2 0 003.8 0H8.1z" />
        </svg>
        {unreadCount > 0 && (
          <>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#6D5EF9]" />
            <span className="absolute right-1 top-1 h-2 w-2 animate-ping rounded-full bg-[#6D5EF9]/70" />
          </>
        )}
      </button>

      {unreadCount > 0 && !open && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#6D5EF9] px-1 text-[9px] font-bold leading-[16px] text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-xl shadow-2xl"
          style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--a-border)' }}
          >
            <span className="text-[13px] font-semibold text-white">Notifications</span>
            <button
              onClick={() => { markAllSeen(); }}
              className="text-[11px] text-white/40 transition-colors hover:text-white/70"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <p className="text-[13px] text-white/40">You&apos;re all caught up</p>
                <p className="text-[11px] text-white/20">New mentions &amp; messages show up here</p>
              </div>
            ) : (
              items.map((n) => {
                const isNew = n.ts > lastSeen;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                    style={{ borderBottom: '1px solid var(--a-border)' }}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: isNew ? '#6D5EF9' : 'transparent' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: n.type === 'mention' ? 'rgba(109,94,249,0.15)' : 'rgba(33,242,166,0.14)',
                            color: n.type === 'mention' ? '#8B7EF9' : '#21F2A6',
                          }}
                        >
                          {n.type}
                        </span>
                        <span className="truncate text-[12px] font-semibold text-white">{n.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-white/45">{n.body}</span>
                      <span className="mt-0.5 block text-[10px] text-white/25">{n.time}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
