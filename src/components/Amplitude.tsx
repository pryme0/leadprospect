'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import * as amplitude from '@amplitude/analytics-browser';

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

let initialized = false;

function ensureInitialized() {
  if (initialized || !AMPLITUDE_API_KEY) return;
  amplitude.init(AMPLITUDE_API_KEY, {
    defaultTracking: {
      attribution: true,
      pageViews: false,
      sessions: true,
      formInteractions: true,
      fileDownloads: true,
    },
  });
  initialized = true;
}

// Custom per-route page-view event names (route-based, host-independent).
function eventNameForPath(pathname: string): string {
  if (pathname.startsWith('/tools/cyber-path-finder')) return 'cyber_page_view';
  if (pathname.startsWith('/tools/career-assessment')) return 'career_page_view';
  if (pathname.startsWith('/tools/resume-analyzer')) return 'resume_page_view';
  return 'page_view';
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!AMPLITUDE_API_KEY) return;
    ensureInitialized();
    const qs = searchParams?.toString();
    const page_path = qs ? `${pathname}?${qs}` : pathname;
    amplitude.track(eventNameForPath(pathname), {
      page_path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function Amplitude() {
  if (!AMPLITUDE_API_KEY) return null;

  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}
