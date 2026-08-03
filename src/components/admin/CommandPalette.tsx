'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  label: string;
  group: string;
  href?: string;
  action?: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
}

const NAV_ITEMS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Funnel', href: '/admin' },
  { id: 'signals', label: 'Signals', group: 'Funnel', href: '/admin/signals' },
  { id: 'leads', label: 'Leads', group: 'Funnel', href: '/admin/leads' },
  { id: 'pipeline', label: 'Pipeline', group: 'Funnel', href: '/admin/pipeline' },
  { id: 'automations', label: 'Automations', group: 'Funnel', href: '/admin/automations' },
  { id: 'conversations', label: 'Conversations', group: 'Engage', href: '/admin/comms' },
  { id: 'templates', label: 'Templates', group: 'Engage', href: '/admin/comms/templates' },
  { id: 'outreach', label: 'Outreach', group: 'Engage', href: '/admin/outreach' },
  { id: 'email', label: 'Email', group: 'Engage', href: '/admin/email' },
  { id: 'signal-sources', label: 'Signal Sources', group: 'Operations', href: '/admin/signal-ops' },
  { id: 'signal-explorer', label: 'Signal Explorer', group: 'Operations', href: '/admin/explore' },
  { id: 'team', label: 'Team', group: 'Organization', href: '/admin/users' },
  { id: 'integrations', label: 'Integrations', group: 'Organization', href: '/admin/integrations' },
  { id: 'settings', label: 'Settings', group: 'Organization', href: '/admin/settings' },
  { id: 'subscription', label: 'Subscription', group: 'Organization', href: '/admin/subscription' },
  { id: 'referrals', label: 'Referrals', group: 'Organization', href: '/admin/referrals' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.group.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS;

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flatList = Object.values(grouped).flat();

  const executeItem = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery('');
      if (item.href) router.push(item.href);
      else if (item.action) item.action();
    },
    [router]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatList[selectedIndex]) {
      e.preventDefault();
      executeItem(flatList[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setOpen(false);
          setQuery('');
        }}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-[520px] overflow-hidden rounded-xl border shadow-2xl"
        style={{
          background: 'var(--a-card)',
          borderColor: 'var(--a-border)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--a-border)' }}>
          <svg className="h-4 w-4 shrink-0 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/25"
          />
          <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-white/30">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
          {flatList.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-white/40">No results found</p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                  {group}
                </p>
                {items.map((item) => {
                  const idx = flatList.findIndex((i) => i.id === item.id);
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                        isSelected ? 'bg-[#6D5EF9]/15 text-white' : 'text-white/60 hover:bg-white/[0.04]'
                      }`}
                    >
                      <svg className="h-4 w-4 shrink-0 text-white/30" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                      </svg>
                      <span className="flex-1">{item.label}</span>
                      {isSelected && (
                        <span className="text-[10px] text-white/30">↵ to open</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t px-4 py-2" style={{ borderColor: 'var(--a-border)' }}>
          <div className="flex items-center gap-3 text-[10px] text-white/25">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-px">↑</kbd>
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-px">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-px">↵</kbd>
              open
            </span>
          </div>
          <span className="text-[10px] text-white/20">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
