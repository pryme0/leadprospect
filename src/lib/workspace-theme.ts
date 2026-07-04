'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface WorkspacePalette {
  id: 'synq';
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

const DARK: WorkspacePalette = {
  id: 'synq',
  mode: 'dark',
  accent:       '#6D5EF9',
  accentStrong: '#5B4FE8',
  accentSoft:   'rgba(109,94,249,0.16)',
  accentFaint:  'rgba(109,94,249,0.07)',
  accentOn:     '#0B1020',
  glow:         'rgba(109,94,249,0.32)',
  radius: { sm: 10, md: 14, lg: 18 },
  chart: [
    '#6D5EF9', // violet
    '#18D8FF', // cyan
    '#21F2A6', // green
    '#FFB547', // amber
    '#FF5C74', // coral
    '#8A94A6', // slate
    '#EC4899', // pink
    '#10B981', // emerald
    '#F97316', // orange
    '#06B6D4', // teal
    '#A3E635', // lime
  ],
  intent: {
    high:   '#FF5C74',
    medium: '#FFB547',
    low:    '#21F2A6',
    none:   'rgba(255,255,255,0.18)',
  },
  platform: {
    google:    '#4285F4',
    facebook:  '#1877F2',
    meta:      '#1877F2',
    instagram: '#E1306C',
    tiktok:    '#010101',
    linkedin:  '#0A66C2',
    twitter:   '#18D8FF',
    reddit:    '#F97316',
    youtube:   '#FF5C74',
  },
  axis:        'rgba(255,255,255,0.28)',
  grid:        'rgba(255,255,255,0.04)',
  fontDisplay: "'Satoshi', 'Inter', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', ui-monospace, monospace",
};

const LIGHT: WorkspacePalette = {
  ...DARK,
  mode:         'light',
  accent:       '#6D5EF9',
  accentStrong: '#5B4FE8',
  accentSoft:   'rgba(109,94,249,0.10)',
  accentFaint:  'rgba(109,94,249,0.05)',
  glow:         'rgba(109,94,249,0.18)',
  chart: [
    '#6D5EF9',
    '#18D8FF',
    '#21F2A6',
    '#FFB547',
    '#FF5C74',
    '#8A94A6',
    '#EC4899',
    '#10B981',
    '#F97316',
    '#06B6D4',
    '#A3E635',
  ],
  intent: {
    high:   '#FF5C74',
    medium: '#FFB547',
    low:    '#21F2A6',
    none:   'rgba(15,23,42,0.18)',
  },
  axis: 'rgba(15,23,42,0.45)',
  grid: 'rgba(15,23,42,0.06)',
};

export function getWorkspacePalette(mode: ThemeMode = 'dark'): WorkspacePalette {
  return mode === 'light' ? LIGHT : DARK;
}

function readMode(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const attr =
    document.querySelector('[data-theme]')?.getAttribute('data-theme')
    ?? localStorage.getItem('synq_theme');
  return attr === 'light' ? 'light' : 'dark';
}

export function useWorkspaceTheme(): WorkspacePalette {
  const [palette, setPalette] = useState<WorkspacePalette>(DARK);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setPalette(getWorkspacePalette(readMode()));
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'synq_theme') sync();
    };
    window.addEventListener('storage', onStorage);

    const target = document.querySelector('[data-theme]');
    const observer = target ? new MutationObserver(sync) : null;
    if (target && observer) {
      observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] });
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      observer?.disconnect();
    };
  }, []);

  return palette;
}
