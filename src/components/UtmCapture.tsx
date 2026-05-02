'use client';

import { useEffect } from 'react';
import { captureUtmsFromUrl } from '@/lib/utm';

// Mounts once via the root layout. Snapshots inbound utm_* params on first
// load so any subsequent lead-capture surface (homepage modal, tool unlocks)
// can read the same first-touch attribution from sessionStorage — without
// every page having to remember to do it themselves.
export default function UtmCapture() {
  useEffect(() => {
    captureUtmsFromUrl();
  }, []);
  return null;
}
