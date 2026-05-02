// Client-side UTM capture & retrieval. Amplitude's `defaultTracking.attribution`
// already grabs utm_* values automatically into user_properties — this module
// exists so OUR backend (lead row, GHL, automation) can also see them. We
// capture on first page load (when the visitor lands with utm_* in the URL)
// and stash in sessionStorage so the values survive client-side route
// changes within the same tab.
//
// First-touch is preferred: if the visitor already has UTMs stashed from an
// earlier page in the session, we don't overwrite them with empty values
// when they navigate to a clean URL. We DO overwrite if a new utm_source
// shows up (e.g. they bounce out and come back via a different campaign).

const STORAGE_KEY = 'emc_utm_v1';

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];

export interface AttributionPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_path?: string;
  captured_at?: string;
}

function readStored(): AttributionPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttributionPayload) : null;
  } catch {
    return null;
  }
}

function writeStored(payload: AttributionPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage can throw in private mode / over quota — non-fatal.
  }
}

// Inspect window.location and persist any utm_* values found. Safe to call
// on every mount — only writes when the URL actually carries new UTMs, so
// returning visits don't blank out a previously captured campaign.
export function captureUtmsFromUrl(): AttributionPayload | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const found: AttributionPayload = {};
  let any = false;
  for (const key of UTM_KEYS) {
    const v = url.searchParams.get(key);
    if (v && v.trim()) {
      found[key] = v.trim().slice(0, 200);
      any = true;
    }
  }
  if (!any) return readStored();

  const payload: AttributionPayload = {
    ...found,
    referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
    landing_path: `${url.pathname}${url.search}`.slice(0, 500),
    captured_at: new Date().toISOString(),
  };
  writeStored(payload);
  return payload;
}

export function getStashedUtms(): AttributionPayload | null {
  return readStored();
}
