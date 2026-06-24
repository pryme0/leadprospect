'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface WorkspacePalette {
  id: 'prospectgrid';
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
  id: 'prospectgrid',
  mode: 'dark',
  accent:       '#2563EB',
  accentStrong: '#1D4ED8',
  accentSoft:   'rgba(37,99,235,0.16)',
  accentFaint:  'rgba(37,99,235,0.07)',
  accentOn:     '#0B132B',
  glow:         'rgba(37,99,235,0.32)',
  radius: { sm: 10, md: 14, lg: 18 },
  chart: [
    '#2563EB', // blue
    '#38BDF8', // sky
    '#22C55E', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#10B981', // emerald
    '#F97316', // orange
    '#06B6D4', // cyan
    '#A3E635', // lime
  ],
  intent: {
    high:   '#EF4444',
    medium: '#F59E0B',
    low:    '#22C55E',
    none:   'rgba(255,255,255,0.18)',
  },
  platform: {
    google:    '#4285F4',
    facebook:  '#1877F2',
    meta:      '#1877F2',
    instagram: '#E1306C',
    tiktok:    '#010101',
    linkedin:  '#0A66C2',
    twitter:   '#38BDF8',
    reddit:    '#F97316',
    youtube:   '#EF4444',
  },
  axis:        'rgba(255,255,255,0.28)',
  grid:        'rgba(255,255,255,0.04)',
  fontDisplay: "'Inter', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', ui-monospace, monospace",
};

const LIGHT: WorkspacePalette = {
  ...DARK,
  mode:         'light',
  accent:       '#2563EB',
  accentStrong: '#1D4ED8',
  accentSoft:   'rgba(37,99,235,0.10)',
  accentFaint:  'rgba(37,99,235,0.05)',
  glow:         'rgba(37,99,235,0.18)',
  chart: [
    '#2563EB',
    '#0EA5E9',
    '#16A34A',
    '#D97706',
    '#DC2626',
    '#7C3AED',
    '#DB2777',
    '#059669',
    '#EA580C',
    '#0891B2',
    '#65A30D',
  ],
  intent: {
    high:   '#DC2626',
    medium: '#D97706',
    low:    '#16A34A',
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
    ?? localStorage.getItem('prospectgrid_theme');
  return attr === 'light' ? 'light' : 'dark';
}

export function useWorkspaceTheme(): WorkspacePalette {
  const [palette, setPalette] = useState<WorkspacePalette>(DARK);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setPalette(getWorkspacePalette(readMode()));
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'prospectgrid_theme') sync();
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
