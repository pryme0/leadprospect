import * as amplitude from '@amplitude/analytics-browser';

export function track(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) return;
  amplitude.track(eventName, properties);
}
