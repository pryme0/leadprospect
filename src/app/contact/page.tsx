'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const CHANNELS = [
  {
    icon: 'trending_up',
    color: 'text-primary',
    ring: 'bg-primary/10',
    title: 'Sales',
    body: 'See SYNQ on your own pipeline and get pricing for your team.',
    email: 'sales@synq.demo',
    meta: 'Replies within 1 business day',
  },
  {
    icon: 'support_agent',
    color: 'text-tertiary',
    ring: 'bg-tertiary/10',
    title: 'Support',
    body: 'Already using SYNQ? Get help with your workspace or integrations.',
    email: 'support@synq.demo',
    meta: 'Mon–Fri, 9am–6pm',
  },
  {
    icon: 'newspaper',
    color: 'text-secondary',
    ring: 'bg-secondary/10',
    title: 'Press & partnerships',
    body: 'Media requests, partnerships, and everything else.',
    email: 'hello@synq.demo',
    meta: 'We read every note',
  },
];

const REASONS = ['Request a demo', 'Pricing question', 'Technical support', 'Partnership', 'Something else'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', reason: REASONS[0], message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [serverError, setServerError] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!form.email.trim()) next.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.message.trim()) next.message = 'Let us know how we can help.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.name.trim(),
          email: form.email.trim(),
          source_tool: 'contact',
          lead_source: 'Contact Form',
          landing_path: '/contact',
          consent_email: true,
          consented: true,
          // Context for the sales team (company + reason + message)
          utm_campaign: form.company.trim() || undefined,
          utm_content: form.reason,
          utm_term: form.message.trim().slice(0, 240),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <main className="relative pt-32 pb-stack-lg overflow-hidden">
      <div className="hero-glow -top-40 -left-20" />
      <div className="hero-glow top-1/3 -right-20" />

      {/* Hero */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-glass-stroke mb-6">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
          <span className="font-mono-label text-mono-label uppercase text-on-surface-variant">Get in touch</span>
        </div>
        <h1 className="font-display-xl text-display-lg-mobile md:text-display-xl text-white mb-6">
          Let&apos;s put your signals <span className="text-primary">to work.</span>
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
          Whether you want a demo, have a pricing question, or need a hand with your workspace — we&apos;re here. Every
          message reaches a real person on our team.
        </p>
      </section>

      {/* Channels + form */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="grid lg:grid-cols-5 gap-gutter">
          {/* Channels */}
          <div className="lg:col-span-2 space-y-6">
            {CHANNELS.map((c) => (
              <div key={c.title} className="glass-card p-6 rounded-2xl">
                <div className={`w-11 h-11 rounded-xl ${c.ring} flex items-center justify-center mb-4`}>
                  <span className={`material-symbols-outlined ${c.color} text-2xl`}>{c.icon}</span>
                </div>
                <h2 className="font-headline-md text-xl text-white mb-1">{c.title}</h2>
                <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">{c.body}</p>
                <a href={`mailto:${c.email}`} className="text-primary font-body-md font-bold hover:underline break-all">
                  {c.email}
                </a>
                <p className="font-mono-label text-mono-label uppercase text-outline mt-2">{c.meta}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="glass-card rounded-[2rem] p-8 md:p-10 h-full">
              {status === 'success' ? (
                <div className="flex flex-col items-center justify-center text-center h-full py-16" role="status" aria-live="polite">
                  <div className="w-16 h-16 rounded-full bg-tertiary/15 flex items-center justify-center mb-6 glow-mint">
                    <span className="material-symbols-outlined text-tertiary text-4xl">mark_email_read</span>
                  </div>
                  <h2 className="font-display-lg text-2xl text-white mb-3">Message sent</h2>
                  <p className="text-on-surface-variant max-w-sm mb-8">
                    Thanks, {form.name.split(' ')[0] || 'there'} — we&apos;ve got it. Someone from our team will reply to{' '}
                    <span className="text-on-surface">{form.email}</span> within one business day.
                  </p>
                  <Link
                    href="/"
                    className="glass-card px-6 py-3 rounded-xl text-white font-bold border border-glass-stroke hover:bg-white/10 transition-all"
                  >
                    Back to home
                  </Link>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-6">
                  <h2 className="font-display-lg text-2xl text-white mb-2">Send us a message</h2>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field
                      id="name"
                      label="Full name"
                      required
                      value={form.name}
                      onChange={set('name')}
                      error={errors.name}
                      autoComplete="name"
                      placeholder="Jordan Rivera"
                    />
                    <Field
                      id="email"
                      label="Work email"
                      required
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      error={errors.email}
                      autoComplete="email"
                      placeholder="you@company.com"
                    />
                  </div>

                  <Field
                    id="company"
                    label="Company"
                    value={form.company}
                    onChange={set('company')}
                    error={errors.company}
                    autoComplete="organization"
                    placeholder="Acme Inc."
                  />

                  <div>
                    <label htmlFor="reason" className="block font-body-md font-medium text-on-surface mb-2">
                      How can we help?
                    </label>
                    <select
                      id="reason"
                      value={form.reason}
                      onChange={set('reason')}
                      className="input-recessed w-full rounded-xl px-4 py-3 text-on-surface appearance-none cursor-pointer"
                    >
                      {REASONS.map((r) => (
                        <option key={r} value={r} className="bg-deep-obsidian text-on-surface">
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block font-body-md font-medium text-on-surface mb-2">
                      Message <span className="text-primary">*</span>
                    </label>
                    <textarea
                      id="message"
                      value={form.message}
                      onChange={set('message')}
                      rows={4}
                      placeholder="Tell us a bit about your team and what you're trying to solve…"
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                      className="input-recessed w-full rounded-xl px-4 py-3 text-on-surface placeholder:text-outline resize-y"
                    />
                    {errors.message && (
                      <p id="message-error" className="text-error text-sm mt-2" role="alert">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {status === 'error' && (
                    <p className="text-error text-sm rounded-xl bg-error/10 border border-error/20 px-4 py-3" role="alert">
                      {serverError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-primary w-full px-8 py-4 rounded-xl text-white font-bold text-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send message
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </>
                    )}
                  </button>
                  <p className="font-mono-label text-mono-label text-outline text-center">
                    By submitting, you agree to our{' '}
                    <Link href="/privacy" className="text-on-surface-variant hover:text-primary underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  id,
  label,
  error,
  required,
  type = 'text',
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block font-body-md font-medium text-on-surface mb-2">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="input-recessed w-full rounded-xl px-4 py-3 text-on-surface placeholder:text-outline"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-error text-sm mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
