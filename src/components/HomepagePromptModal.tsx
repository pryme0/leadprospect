'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { leadsApi } from '@/lib/api';
import { getStashedUtms } from '@/lib/utm';
import { track } from '@/lib/analytics';

// Compelling pitches rotated by trigger so a returning visitor does not see
// the same headline twice. Tone: specific outcome + reason to act now.
const PITCHES = [
  {
    eyebrow: "Don't lose another qualified account",
    headline: 'See which ad clicks are turning into real business leads.',
    body:
      "ProspectGrid connects campaign source, company enrichment, and routing status so your team can act on high-intent accounts while they are still warm.",
  },
  {
    eyebrow: 'Ad platforms plus CRM context',
    headline: 'Turn Google, Meta, TikTok, and Instagram leads into one clean queue.',
    body:
      "Send us your preferred channel and we will show how lead scoring, dedupe, suppression, and CRM routing fit your current acquisition stack.",
  },
  {
    eyebrow: 'Before the lead goes cold',
    headline: 'Get a source-aware routing preview.',
    body:
      "Map every new prospect to the right sales, nurture, or agency workflow based on source, fit, intent, and account enrichment.",
  },
];

interface ContactFormData {
  first_name: string;
  email: string;
  phoneLocal: string;
  countryKey: string;
  consent_call: boolean;
  consent_email: boolean;
  consented: boolean;
}

interface CountryEntry {
  code: string; dial: string; flag: string; name: string;
  minLen: number; maxLen: number; example: string;
}
const COUNTRY_CODES: CountryEntry[] = [
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States',  minLen: 10, maxLen: 10, example: '2025551234' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada',         minLen: 10, maxLen: 10, example: '4165551234' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom', minLen: 10, maxLen: 10, example: '7400123456' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia',      minLen: 9,  maxLen: 9,  example: '412345678' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria',        minLen: 10, maxLen: 10, example: '8031234567' },
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India',          minLen: 10, maxLen: 10, example: '9123456789' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana',          minLen: 9,  maxLen: 9,  example: '241234567' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya',          minLen: 9,  maxLen: 9,  example: '712345678' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa',   minLen: 9,  maxLen: 9,  example: '821234567' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE',            minLen: 9,  maxLen: 9,  example: '501234567' },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines',    minLen: 10, maxLen: 10, example: '9171234567' },
];

interface Props {
  isOpen: boolean;
  pitchIndex: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function HomepagePromptModal({
  isOpen,
  pitchIndex,
  onClose,
  onSubmitted,
}: Props) {
  const [form, setForm] = useState<ContactFormData>({
    first_name: '',
    email: '',
    phoneLocal: '',
    countryKey: 'US|+1',
    consent_call: true,
    consent_email: true,
    consented: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const pitch = PITCHES[pitchIndex % PITCHES.length];
  const country =
    COUNTRY_CODES.find((c) => `${c.code}|${c.dial}` === form.countryKey) || COUNTRY_CODES[0];

  useEffect(() => {
    if (isOpen) {
      // Reset state on each open so a re-trigger after dismiss starts clean,
      // but don't reset across the same session if already submitted.
      if (!done) {
        setErrors({});
        setSubmitError('');
        setLoading(false);
      }
      // Focus first field after the modal animates in.
      const t = setTimeout(() => firstFieldRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen, done]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Esc to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const update = (patch: Partial<ContactFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.first_name.trim()) next.first_name = 'First name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = 'Enter a valid email';

    const digits = form.phoneLocal.replace(/\D/g, '');
    if (!digits) next.phone = 'Phone number is required';
    else if (digits.length < country.minLen || digits.length > country.maxLen)
      next.phone = country.minLen === country.maxLen
        ? `${country.name} numbers are ${country.minLen} digits`
        : `${country.name} numbers are ${country.minLen}–${country.maxLen} digits`;

    if (!form.consent_call && !form.consent_email)
      next.channel = 'Tick at least one — call or email — so we can reach you';

    if (!form.consented) next.consented = 'Please accept to continue';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const phoneE164 = `${country.dial}${form.phoneLocal.replace(/\D/g, '')}`;
      const utms = getStashedUtms() || {};
      await leadsApi.quickCapture({
        first_name: form.first_name.trim(),
        email: form.email.trim(),
        phone_number: phoneE164,
        consent_call: form.consent_call,
        consent_email: form.consent_email,
        consented: form.consented,
        lead_source: 'homepage_modal',
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_term: utms.utm_term,
        utm_content: utms.utm_content,
        referrer: utms.referrer,
        landing_path: utms.landing_path,
      });
      // Amplitude already tags every event with utm_* via defaultTracking
      // attribution — we send them explicitly here too so this single event
      // carries the same campaign tags that the lead row gets server-side,
      // making it easy to join in Amplitude dashboards.
      track('homepage_modal_submitted', {
        consent_call: form.consent_call,
        consent_email: form.consent_email,
        pitch_index: pitchIndex,
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_term: utms.utm_term,
        utm_content: utms.utm_content,
        referrer: utms.referrer,
        landing_path: utms.landing_path,
      });
      setDone(true);
      onSubmitted();
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message?.toString() ||
        err?.message ||
        'Something went wrong — please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="homepage-prompt-title"
        className="relative w-full max-w-lg glass p-7 sm:p-8 animate-slide-up max-h-[92vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-brand-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {done ? (
          <div className="py-6 text-center space-y-4">
            <div
              className="mx-auto w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(11,170,239,0.15)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="#00CEC8" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">You're in.</h3>
            <p className="text-brand-muted text-sm max-w-sm mx-auto">
              We'll reach out via {form.consent_call && form.consent_email
                ? 'call or email'
                : form.consent_call ? 'a call' : 'email'}{' '}
              within the next business day. Watch for us.
            </p>
            <button
              onClick={onClose}
              className="btn-primary mt-2"
            >
              Keep exploring
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2"
                style={{ color: '#00CEC8' }}
              >
                {pitch.eyebrow}
              </p>
              <h2
                id="homepage-prompt-title"
                className="text-white font-extrabold text-2xl sm:text-[26px] leading-[1.15] tracking-tight"
              >
                {pitch.headline}
              </h2>
              <p className="text-brand-muted text-sm mt-3 leading-relaxed">
                {pitch.body}
              </p>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-brand-danger text-sm">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">First name <span className="text-brand-danger">*</span></label>
                <input
                  ref={firstFieldRef}
                  type="text"
                  className="input-field"
                  placeholder="Jordan"
                  value={form.first_name}
                  onChange={(e) => update({ first_name: e.target.value })}
                />
                {errors.first_name && <p className="error-text">{errors.first_name}</p>}
              </div>

              <div>
                <label className="label-text">Email <span className="text-brand-danger">*</span></label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@work.com"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>

              <div>
                <label className="label-text">Phone <span className="text-brand-danger">*</span></label>
                <div className="flex gap-2">
                  <select
                    aria-label="Country code"
                    className="select-field !w-auto min-w-[110px] shrink-0 pr-6"
                    value={form.countryKey}
                    onChange={(e) => {
                      const next = COUNTRY_CODES.find((c) => `${c.code}|${c.dial}` === e.target.value) || COUNTRY_CODES[0];
                      update({
                        countryKey: e.target.value,
                        phoneLocal: form.phoneLocal.replace(/\D/g, '').slice(0, next.maxLen),
                      });
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.code}-${c.dial}`} value={`${c.code}|${c.dial}`}>
                        {c.flag} {c.dial} {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="input-field flex-1"
                    placeholder={country.example}
                    maxLength={country.maxLen}
                    value={form.phoneLocal}
                    onChange={(e) =>
                      update({
                        phoneLocal: e.target.value.replace(/\D/g, '').slice(0, country.maxLen),
                      })
                    }
                  />
                </div>
                {errors.phone && <p className="error-text">{errors.phone}</p>}
              </div>

              <div className="pt-1 space-y-2">
                <p className="label-text mb-2">How can we reach you? <span className="text-brand-danger">*</span></p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.consent_call}
                    onChange={(e) => update({ consent_call: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-brand-slate bg-brand-navy text-[#00CEC8] focus:ring-[#00CEC8]/30 cursor-pointer"
                  />
                  <span className="text-sm text-white/85">
                    OK to <span className="text-white font-semibold">call</span> me on this number
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.consent_email}
                    onChange={(e) => update({ consent_email: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-brand-slate bg-brand-navy text-[#00CEC8] focus:ring-[#00CEC8]/30 cursor-pointer"
                  />
                  <span className="text-sm text-white/85">
                    OK to <span className="text-white font-semibold">email</span> me
                  </span>
                </label>
                {errors.channel && <p className="error-text">{errors.channel}</p>}
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.consented}
                    onChange={(e) => update({ consented: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-brand-slate bg-brand-navy text-[#00CEC8] focus:ring-[#00CEC8]/30 cursor-pointer"
                  />
                  <span className="text-xs text-brand-muted">
                    I agree to be contacted by ProspectGrid about lead intelligence resources.{' '}
                    <Link href="/privacy" target="_blank" className="text-[#00CEC8] underline">
                      Privacy Policy
                    </Link>
                    <span className="text-brand-danger"> *</span>
                  </span>
                </label>
                {errors.consented && <p className="error-text">{errors.consented}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner" />
                    Sending…
                  </>
                ) : (
                  'Get my roadmap'
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="block w-full text-center text-xs text-brand-muted hover:text-white transition-colors mt-1"
              >
                Not right now
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
