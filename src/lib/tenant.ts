// Multi-tenant frontend layer. The selected tenant is stored in localStorage
// and forwarded to the backend on every admin call via the X-Tenant header.
// Backend reads it via the @TenantHeader() decorator and scopes signal/lead/
// dashboard queries to that tenant. EMCI is the default for legacy data.

export type TenantId = 'EMCI' | 'LIGHTFORTH';

export const TENANTS: Record<TenantId, TenantConfig> = {
  EMCI: {
    id: 'EMCI',
    name: 'ExcelMindCyber',
    shortName: 'EMCI',
    tagline: 'Lead Intelligence Engine',
    description: 'Cybersecurity career accelerator',
    logoSrc: '/emclogo.png',
    accent: '#0BAAEF',
    initials: 'EM',
  },
  LIGHTFORTH: {
    id: 'LIGHTFORTH',
    name: 'Lightforth',
    shortName: 'Lightforth',
    tagline: 'Lead Intelligence Engine',
    description: 'Job placement & career services',
    // No logo file yet — the UI falls back to a wordmark when this is empty.
    logoSrc: '',
    accent: '#FFFFFF',
    initials: 'LF',
  },
};

export interface TenantConfig {
  id: TenantId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  logoSrc: string;
  accent: string;
  initials: string;
}

const STORAGE_KEY = 'emc_tenant';

export function getCurrentTenant(): TenantId | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'EMCI' || v === 'LIGHTFORTH') return v;
  return null;
}

export function setCurrentTenant(id: TenantId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function clearCurrentTenant() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getTenantConfig(id: TenantId | null): TenantConfig {
  return TENANTS[id ?? 'EMCI'];
}
