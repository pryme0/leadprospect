// Multi-SBU (Strategic Business Unit) frontend layer. The selected SBU is
// persisted in localStorage and forwarded to the backend on every admin
// call via the X-SBU header. The backend reads it through @SbuHeader() and
// scopes signal/lead/dashboard queries by `sbu_id`. 'emc' is the default for
// legacy data and public lead-capture writes.
//
// Lowercase ids match the `sbus` table in Postgres so a single value travels
// unchanged from picker → header → SQL filter.

export type SbuId = 'emc' | 'lightforth';

export interface SbuConfig {
  id: SbuId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  logoSrc: string;
  accent: string;
  initials: string;
}

export const SBUS: Record<SbuId, SbuConfig> = {
  emc: {
    id: 'emc',
    name: 'ExcelMindCyber',
    shortName: 'EMC',
    tagline: 'Lead Intelligence Engine',
    description: 'Cybersecurity career accelerator',
    logoSrc: '/emclogo.png',
    accent: '#0BAAEF',
    initials: 'EM',
  },
  lightforth: {
    id: 'lightforth',
    name: 'Lightforth',
    shortName: 'Lightforth',
    tagline: 'Lead Intelligence Engine',
    description: 'Job placement & career services',
    logoSrc: '/lightforth.png',
    accent: '#04947c',
    initials: 'LF',
  },
};

const STORAGE_KEY = 'emc_sbu';
const LEGACY_STORAGE_KEY = 'emc_tenant';

// One-shot migration from yesterday's uppercase tenant key. Called from every
// read so users who already picked a workspace before this deploy don't get
// bounced back to the picker.
function migrateLegacy(): SbuId | null {
  if (typeof window === 'undefined') return null;
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  const mapped: SbuId | null =
    legacy === 'EMCI' ? 'emc' : legacy === 'LIGHTFORTH' ? 'lightforth' : null;
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  if (mapped) window.localStorage.setItem(STORAGE_KEY, mapped);
  return mapped;
}

export function getCurrentSbu(): SbuId | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'emc' || v === 'lightforth') return v;
  return migrateLegacy();
}

export function setCurrentSbu(id: SbuId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function clearCurrentSbu() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function getSbuConfig(id: SbuId | null): SbuConfig {
  return SBUS[id ?? 'emc'];
}
