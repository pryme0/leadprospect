'use client';

import { useEffect, useState } from 'react';
import { SbuId, getCurrentSbu } from './sbu';

export type ThemeMode = 'dark' | 'light';

export interface TenantPalette {
  id: SbuId;
  mode: ThemeMode;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentFaint: string;
  accentOn: string;
  glow: string;
  radius: { sm: number; md: number; lg: number };
  chart: string[];
  intent: { high: string; medium: string; low: string; none: string };
  platform: Record<string, string>;
  axis: string;
  grid: string;
  fontDisplay: string;
  fontMono: string;
}

const EMCI_DARK: TenantPalette = {
  id: 'emc',
  mode: 'dark',
  accent: '#0BAAEF',
  accentStrong: '#0888CC',
  accentSoft: 'rgba(11,170,239,0.15)',
  accentFaint: 'rgba(11,170,239,0.06)',
  accentOn: '#ffffff',
  glow: 'rgba(11,170,239,0.35)',
  radius: { sm: 10, md: 16, lg: 20 },
  chart: [
    '#0BAAEF', '#40C4FF', '#6366f1', '#f97316',
    '#f43f5e', '#10b981', '#a855f7', '#eab308',
    '#06b6d4', '#ec4899', '#84cc16',
  ],
  intent: { high: '#f43f5e', medium: '#f97316', low: '#0BAAEF', none: 'rgba(255,255,255,0.18)' },
  platform: { twitter: '#40C4FF', reddit: '#f97316', youtube: '#f43f5e', google: '#6366f1' },
  axis: 'rgba(255,255,255,0.30)',
  grid: 'rgba(255,255,255,0.04)',
  fontDisplay: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

// Light mode for EMCI: same hue family, calibrated for light surfaces.
const EMCI_LIGHT: TenantPalette = {
  ...EMCI_DARK,
  mode: 'light',
  accent: '#0888CC',
  accentStrong: '#0666A0',
  accentSoft: 'rgba(11,170,239,0.12)',
  accentFaint: 'rgba(11,170,239,0.05)',
  accentOn: '#ffffff',
  glow: 'rgba(11,170,239,0.20)',
  chart: [
    '#0888CC', '#0BAAEF', '#4f46e5', '#ea580c',
    '#dc2626', '#059669', '#9333ea', '#ca8a04',
    '#0891b2', '#db2777', '#65a30d',
  ],
  intent: { high: '#dc2626', medium: '#ea580c', low: '#0888CC', none: 'rgba(15,23,42,0.18)' },
  platform: { twitter: '#0BAAEF', reddit: '#ea580c', youtube: '#dc2626', google: '#4f46e5' },
  axis: 'rgba(15,23,42,0.45)',
  grid: 'rgba(15,23,42,0.06)',
};

// Lightforth brand: deep navy + teal primaries, with orange / lavender / peach
// secondaries. Teal is the workhorse accent (active states, CTAs); orange is
// the spotlight (urgency, hot intent, the lightning-bolt energy of the logo).
//
// Primary:   #0a2a60 navy   #04947c teal     #005761 dark teal
// Secondary: #9791ff lavender #ff5e00 orange #ffcdb0 peach
const LIGHTFORTH_DARK: TenantPalette = {
  id: 'lightforth',
  mode: 'dark',
  accent: '#04947c',
  accentStrong: '#005761',
  accentSoft: 'rgba(4,148,124,0.18)',
  accentFaint: 'rgba(4,148,124,0.06)',
  accentOn: '#ffffff',
  glow: 'rgba(4,148,124,0.40)',
  radius: { sm: 6, md: 10, lg: 14 },
  chart: [
    '#04947c', '#ff5e00', '#9791ff', '#0a2a60',
    '#ffcdb0', '#005761', '#06b6d4', '#a78bfa',
    '#fb923c', '#22d3ee',
  ],
  intent: { high: '#ff5e00', medium: '#ffcdb0', low: '#04947c', none: 'rgba(255,255,255,0.18)' },
  platform: {
    twitter: '#9791ff',
    reddit: '#ff5e00',
    youtube: '#ffcdb0',
    google: '#04947c',
    linkedin: '#0a2a60',
    instagram: '#ffcdb0',
  },
  axis: 'rgba(255,255,255,0.35)',
  grid: 'rgba(255,255,255,0.05)',
  fontDisplay: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

// Light mode for Lightforth: white surfaces, deep-navy text, teal accent
// holds, orange brightens to read on white.
const LIGHTFORTH_LIGHT: TenantPalette = {
  ...LIGHTFORTH_DARK,
  mode: 'light',
  accent: '#04947c',
  accentStrong: '#005761',
  accentSoft: 'rgba(4,148,124,0.12)',
  accentFaint: 'rgba(4,148,124,0.04)',
  accentOn: '#ffffff',
  glow: 'rgba(4,148,124,0.20)',
  chart: [
    '#04947c', '#ea580c', '#7c6cf0', '#0a2a60',
    '#f59e0b', '#005761', '#0891b2', '#8b5cf6',
    '#ea580c', '#0e7490',
  ],
  intent: { high: '#ea580c', medium: '#f59e0b', low: '#04947c', none: 'rgba(15,23,42,0.18)' },
  platform: {
    twitter: '#7c6cf0',
    reddit: '#ea580c',
    youtube: '#f59e0b',
    google: '#04947c',
    linkedin: '#0a2a60',
    instagram: '#f59e0b',
  },
  axis: 'rgba(15,23,42,0.50)',
  grid: 'rgba(15,23,42,0.08)',
};

export function getTenantPalette(
  id: SbuId | null | undefined,
  mode: ThemeMode = 'dark',
): TenantPalette {
  if (id === 'lightforth') return mode === 'light' ? LIGHTFORTH_LIGHT : LIGHTFORTH_DARK;
  return mode === 'light' ? EMCI_LIGHT : EMCI_DARK;
}

function readMode(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  // Prefer the data-theme attribute on the admin shell (set by AdminLayout);
  // fall back to localStorage so first paint matches before the layout mounts.
  const attr =
    document.querySelector('[data-theme]')?.getAttribute('data-theme')
    ?? localStorage.getItem('emc_theme');
  return attr === 'light' ? 'light' : 'dark';
}

export function useTenantTheme(): TenantPalette {
  const [palette, setPalette] = useState<TenantPalette>(EMCI_DARK);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setPalette(getTenantPalette(getCurrentSbu(), readMode()));
    sync();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'emc_sbu' || e.key === 'emc_theme') sync();
    };
    window.addEventListener('storage', onStorage);

    // Theme toggle in the same tab updates data-theme on the shell. Watch it
    // so charts re-paint without a refresh.
    const target = document.querySelector('[data-theme]');
    const observer = target
      ? new MutationObserver(sync)
      : null;
    if (target && observer) {
      observer.observe(target, { attributes: true, attributeFilter: ['data-theme', 'data-sbu'] });
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      observer?.disconnect();
    };
  }, []);

  return palette;
}
