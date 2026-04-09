'use client';

import { useState } from 'react';
import Link from 'next/link';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  resultId: string;
  sourceTool: string;
}

export interface LeadFormData {
  first_name: string;
  email: string;
  phone_number: string;
  country: string;
  current_job: string;
  income_range: string;
  source_tool: string;
  result_id: string;
  consented: boolean;
}

const INCOME_RANGES = [
  'Under $30,000',
  '$30,000 - $50,000',
  '$50,000 - $75,000',
  '$75,000 - $100,000',
  '$100,000 - $150,000',
  '$150,000+',
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'Nigeria', 'India', 'South Africa', 'Kenya', 'Ghana',
  'Netherlands', 'France', 'Ireland', 'Singapore', 'UAE',
  'Brazil', 'Mexico', 'Philippines', 'Japan', 'Other',
];

export default function LeadCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  resultId,
  sourceTool,
}: LeadCaptureModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    first_name: '',
    email: '',
    phone_number: '',
    country: '',
    current_job: '',
    income_range: '',
    source_tool: sourceTool,
    result_id: resultId,
    consented: false,
  });
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

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!/^\+[1-9]\d{1,14}$/.test(formData.phone_number.replace(/\s/g, ''))) {
      newErrors.phone_number = 'Use E.164 format: +12025551234 (country code + number, no spaces)';
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
      await onSubmit({
        ...formData,
        source_tool: sourceTool,
        result_id: resultId,
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

          {/* Phone */}
          <div>
            <label className="label-text">
              Phone Number <span className="text-brand-danger">*</span>
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="+12025551234"
              value={formData.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
            />
            {errors.phone_number && <p className="error-text">{errors.phone_number}</p>}
          </div>

          {/* Country (optional) */}
          <div>
            <label className="label-text">Country</label>
            <select
              className="select-field"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
            >
              <option value="">Select country (optional)</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Current Job (optional) */}
          <div>
            <label className="label-text">Current Job Title</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. IT Support, Student, Manager"
              value={formData.current_job}
              onChange={(e) => handleChange('current_job', e.target.value)}
            />
          </div>

          {/* Income Range (optional) */}
          <div>
            <label className="label-text">Current Income Range</label>
            <select
              className="select-field"
              value={formData.income_range}
              onChange={(e) => handleChange('income_range', e.target.value)}
            >
              <option value="">Select range (optional)</option>
              {INCOME_RANGES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Consent */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consented}
                onChange={(e) => handleChange('consented', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-brand-slate bg-brand-navy text-brand-accent focus:ring-brand-accent/30 cursor-pointer"
              />
              <span className="text-sm text-brand-muted">
                I agree to be contacted via email/SMS by ExcelMindCyber about cybersecurity career
                resources and opportunities.{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-brand-accent hover:text-brand-accent-dim underline"
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
