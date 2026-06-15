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
  accent: '#00CEC8',
  accentStrong: '#009B98',
  accentSoft: 'rgba(0,206,200,0.16)',
  accentFaint: 'rgba(0,206,200,0.07)',
  accentOn: '#112126',
  glow: 'rgba(0,206,200,0.32)',
  radius: { sm: 12, md: 18, lg: 26 },
  chart: ['#00CEC8', '#FF9C5F', '#EB4203', '#FCEFC3', '#38bdf8', '#a78bfa', '#10b981', '#f472b6', '#84cc16', '#22d3ee', '#facc15'],
  intent: { high: '#EB4203', medium: '#FF9C5F', low: '#00CEC8', none: 'rgba(255,255,255,0.18)' },
  platform: {
    google: '#4f46e5',
    facebook: '#1877f2',
    meta: '#1877f2',
    instagram: '#db2777',
    tiktok: '#111827',
    linkedin: '#0a66c2',
    twitter: '#38bdf8',
    reddit: '#f97316',
    youtube: '#f43f5e',
  },
  axis: 'rgba(255,255,255,0.30)',
  grid: 'rgba(255,255,255,0.04)',
  fontDisplay: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

const LIGHT: WorkspacePalette = {
  ...DARK,
  mode: 'light',
  accent: '#009B98',
  accentStrong: '#006B67',
  accentSoft: 'rgba(0,155,152,0.12)',
  accentFaint: 'rgba(0,155,152,0.05)',
  glow: 'rgba(0,155,152,0.20)',
  chart: ['#009B98', '#FF9C5F', '#EB4203', '#ca8a04', '#0284c7', '#7c3aed', '#059669', '#be185d', '#65a30d', '#0891b2', '#a16207'],
  intent: { high: '#EB4203', medium: '#FF9C5F', low: '#009B98', none: 'rgba(15,23,42,0.18)' },
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
