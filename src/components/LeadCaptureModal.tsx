'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getStashedUtms } from '@/lib/utm';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  resultId: string;
  sourceTool: string;
  leadSource?: string;
}

export interface LeadFormData {
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start: string;
  income_goal: string;
  source_tool: string;
  result_id: string;
  consented: boolean;
  lead_source?: string;
  // First-touch attribution — read from sessionStorage on submit so
  // tool-unlock leads carry the same campaign tags Amplitude already sees.
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_path?: string;
}

const INCOME_GOALS = [
  'Under $60,000',
  '$60,000 - $90,000',
  '$90,000 - $130,000',
  '$130,000 - $180,000',
  '$180,000+',
];

const TIMELINES = [
  'Immediately - route high-intent leads now',
  'Within the next 30 days',
  'Within the next quarter',
  'This year',
  'Just exploring lead intelligence',
];

// Common country dialing codes — US + Canada first (primary market), then others.
// minLen/maxLen are NSN (national significant number) digit counts, excluding country code.
interface CountryEntry {
  code: string; dial: string; flag: string; name: string;
  minLen: number; maxLen: number; example: string;
}
const COUNTRY_CODES: CountryEntry[] = [
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States',  minLen: 10, maxLen: 10, example: '2025551234' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada',         minLen: 10, maxLen: 10, example: '4165551234' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom', minLen: 10, maxLen: 10, example: '7400123456' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia',      minLen: 9,  maxLen: 9,  example: '412345678'  },
  { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Ireland',        minLen: 9,  maxLen: 9,  example: '851234567'  },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'New Zealand',    minLen: 8,  maxLen: 10, example: '211234567'  },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany',        minLen: 10, maxLen: 11, example: '15123456789' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France',         minLen: 9,  maxLen: 9,  example: '612345678'  },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Netherlands',    minLen: 9,  maxLen: 9,  example: '612345678'  },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spain',          minLen: 9,  maxLen: 9,  example: '612345678'  },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italy',          minLen: 9,  maxLen: 10, example: '3123456789' },
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India',          minLen: 10, maxLen: 10, example: '9123456789' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria',        minLen: 10, maxLen: 10, example: '8031234567' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa',   minLen: 9,  maxLen: 9,  example: '821234567'  },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya',          minLen: 9,  maxLen: 9,  example: '712345678'  },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana',          minLen: 9,  maxLen: 9,  example: '241234567'  },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE',            minLen: 9,  maxLen: 9,  example: '501234567'  },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore',      minLen: 8,  maxLen: 8,  example: '81234567'   },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines',    minLen: 10, maxLen: 10, example: '9171234567' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazil',         minLen: 10, maxLen: 11, example: '11912345678' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico',         minLen: 10, maxLen: 10, example: '5512345678' },
];

export default function LeadCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  resultId,
  sourceTool,
  leadSource,
}: LeadCaptureModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    first_name: '',
    email: '',
    phone_number: '',
    timeline_to_start: '',
    income_goal: '',
    source_tool: sourceTool,
    result_id: resultId,
    consented: false,
  });
  const [countryKey, setCountryKey] = useState('US|+1'); // default US
  const selectedCountry =
    COUNTRY_CODES.find((c) => `${c.code}|${c.dial}` === countryKey) || COUNTRY_CODES[0];
  const dialCode = selectedCountry.dial;
  const [phoneLocal, setPhoneLocal] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    const digitsOnly = phoneLocal.replace(/\D/g, '');
    const { minLen, maxLen, name } = selectedCountry;
    if (!digitsOnly) {
      newErrors.phone_number = 'Phone number is required';
    } else if (digitsOnly.length < minLen || digitsOnly.length > maxLen) {
      newErrors.phone_number =
        minLen === maxLen
          ? `${name} numbers must be exactly ${minLen} digits`
          : `${name} numbers must be ${minLen}–${maxLen} digits`;
    } else {
      const fullE164 = `${dialCode}${digitsOnly}`;
      if (!/^\+[1-9]\d{1,14}$/.test(fullE164)) {
        newErrors.phone_number = 'Invalid phone number format';
      }
    }

    if (!formData.timeline_to_start) {
      newErrors.timeline_to_start = 'Please select your timeline';
    }

    if (!formData.income_goal) {
      newErrors.income_goal = 'Please select your income goal';
    }

    if (!formData.consented) {
      newErrors.consented = 'You must agree to be contacted to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const fullPhone = `${dialCode}${phoneLocal.replace(/\D/g, '')}`;
      const utms = getStashedUtms() || {};
      await onSubmit({
        ...formData,
        phone_number: fullPhone,
        source_tool: sourceTool,
        result_id: resultId,
        lead_source: leadSource,
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_term: utms.utm_term,
        utm_content: utms.utm_content,
        referrer: utms.referrer,
        landing_path: utms.landing_path,
      });
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof LeadFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass p-8 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Unlock Your Full Results
          </h2>
          <p className="text-brand-muted text-sm">
            Enter your details below to access your complete personalized report.
          </p>
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-brand-danger text-sm">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <label className="label-text">
              First Name <span className="text-brand-danger">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="John"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
            />
            {errors.first_name && <p className="error-text">{errors.first_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label-text">
              Email <span className="text-brand-danger">*</span>
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          {/* Phone — country code selector + national number */}
          <div>
            <label className="label-text">
              Phone Number <span className="text-brand-danger">*</span>
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Country dialing code"
                className="select-field !w-auto min-w-[110px] shrink-0 pr-6"
                value={countryKey}
                onChange={(e) => {
                  setCountryKey(e.target.value);
                  // Trim phone digits if longer than the new country's max
                  const newCountry =
                    COUNTRY_CODES.find((c) => `${c.code}|${c.dial}` === e.target.value) ||
                    COUNTRY_CODES[0];
                  const digits = phoneLocal.replace(/\D/g, '').slice(0, newCountry.maxLen);
                  setPhoneLocal(digits);
                  if (errors.phone_number) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.phone_number;
                      return next;
                    });
                  }
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
                placeholder={selectedCountry.example}
                maxLength={selectedCountry.maxLen}
                value={phoneLocal}
                onChange={(e) => {
                  // Strip non-digits and cap at max length for the selected country
                  const digits = e.target.value
                    .replace(/\D/g, '')
                    .slice(0, selectedCountry.maxLen);
                  setPhoneLocal(digits);
                  if (errors.phone_number) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.phone_number;
                      return next;
                    });
                  }
                }}
              />
            </div>
            {errors.phone_number ? (
              <p className="error-text">{errors.phone_number}</p>
            ) : (
              <p className="text-xs text-brand-muted mt-1">
                {selectedCountry.minLen === selectedCountry.maxLen
                  ? `${selectedCountry.minLen} digits`
                  : `${selectedCountry.minLen}–${selectedCountry.maxLen} digits`} ·
                example: {dialCode} {selectedCountry.example}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <label className="label-text">
              How soon do you want to route qualified leads? <span className="text-brand-danger">*</span>
            </label>
            <select
              className="select-field"
              value={formData.timeline_to_start}
              onChange={(e) => handleChange('timeline_to_start', e.target.value)}
            >
              <option value="">Select your timeline</option>
              {TIMELINES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.timeline_to_start && <p className="error-text">{errors.timeline_to_start}</p>}
          </div>

          {/* Income Goal */}
          <div>
            <label className="label-text">
              Salary Expectation / Income Goal <span className="text-brand-danger">*</span>
            </label>
            <select
              className="select-field"
              value={formData.income_goal}
              onChange={(e) => handleChange('income_goal', e.target.value)}
            >
              <option value="">Select your target income</option>
              {INCOME_GOALS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.income_goal && <p className="error-text">{errors.income_goal}</p>}
          </div>

          {/* Consent */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consented}
                onChange={(e) => handleChange('consented', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-brand-slate bg-brand-navy text-[#00CEC8] focus:ring-[#00CEC8]/30 cursor-pointer"
              />
              <span className="text-sm text-brand-muted">
                I agree to be contacted via email/SMS by ProspectGrid about lead intelligence
                resources, product updates, and demo follow-up.{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-[#00CEC8] hover:text-[#00CEC8]-dim underline"
                >
                  Privacy Policy
                </Link>
                <span className="text-brand-danger"> *</span>
              </span>
            </label>
            {errors.consented && <p className="error-text">{errors.consented}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <span className="loading-spinner" />
                Unlocking...
              </>
            ) : (
              'Unlock Full Results'
            )}
          </button>

          <p className="text-xs text-brand-muted text-center mt-2">
            We respect your privacy. Your data is encrypted and secure.
          </p>
        </form>
      </div>
    </div>
  );
}
