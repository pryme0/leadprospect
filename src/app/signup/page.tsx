'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* Design tokens (Velocity Systems light theme, matching the homepage) */
const NAVY = '#0a1128';    // headlines + logo wordmark
const PURPLE = '#6f2ce3';  // primary accent
const BLUE = '#4f8aff';    // blue accent
const GREEN = '#16a34a';   // green accent
const SURFACE = '#f7f9fb'; // page background
const INK = '#191c1e';     // on-surface
const MUTED = '#46464d';   // on-surface-variant

export default function SignupPage() {
  const [form, setForm] = useState({ organization: '', name: '', email: '', role: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  // Capture a referral code from ?ref= (or a previously-stored one) so a referred
  // signup can be attributed when the super admin later creates the org.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref');
      const code = (fromUrl || localStorage.getItem('synq_ref') || '').trim();
      if (code) { setRefCode(code); localStorage.setItem('synq_ref', code); }
    } catch { /* ignore */ }
  }, []);

  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.organization,
          message: form.role ? `Role: ${form.role}` : undefined,
          ref: refCode || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.message || 'Could not submit your request. Please try again.'); return; }
      setSubmitted(true);
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen w-full flex-col overflow-x-hidden antialiased md:flex-row"
      style={{ backgroundColor: SURFACE, color: INK, fontFamily: 'var(--font-inter)' }}
    >

      {/* ── Left: visual showcase ── */}
      <section
        className="relative hidden w-1/2 items-center justify-center overflow-hidden p-gutter md:sticky md:top-0 md:flex md:h-screen"
        style={{ backgroundColor: SURFACE }}
      >
        <div className="absolute right-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full blur-[120px]" style={{ backgroundColor: 'rgba(234,221,255,.55)' }} />
        <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full blur-[100px]" style={{ backgroundColor: 'rgba(220,225,255,.55)' }} />

        <div className="relative z-10 w-full max-w-lg rotate-1 shadow-xl transition-transform duration-700 hover:rotate-0">
          {/* Self-contained CSS dashboard mock (no external image dependency) */}
          <div className="glass-card overflow-hidden rounded-xl p-2">
            <div className="overflow-hidden rounded-lg" style={{ backgroundColor: SURFACE }}>
              {/* window bar */}
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'rgba(10,17,40,0.08)' }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'rgba(10,17,40,0.12)' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'rgba(10,17,40,0.12)' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'rgba(10,17,40,0.12)' }} />
                <span className="ml-3 text-[10px] uppercase tracking-wider" style={{ color: MUTED, fontFamily: 'var(--font-jetbrains)' }}>Your SYNQ account</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(22,163,74,0.10)' }}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: GREEN }} />
                  <span className="text-[10px] uppercase" style={{ color: GREEN, fontFamily: 'var(--font-jetbrains)' }}>Live</span>
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* KPI tiles */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: 'New customers', v: '1,245', c: NAVY },
                    { k: 'Ready to buy', v: '85%',   c: GREEN },
                    { k: 'Sent to you',  v: '312',   c: BLUE },
                  ].map((t) => (
                    <div key={t.k} className="rounded-lg border bg-white p-3" style={{ borderColor: 'rgba(10,17,40,0.08)' }}>
                      <p className="text-[10px] uppercase" style={{ color: MUTED, fontFamily: 'var(--font-jetbrains)' }}>{t.k}</p>
                      <p className="mt-1 text-xl font-bold" style={{ color: t.c, fontFamily: 'var(--font-sora)' }}>{t.v}</p>
                    </div>
                  ))}
                </div>

                {/* faux bar chart */}
                <div className="rounded-lg border bg-white p-4" style={{ borderColor: 'rgba(10,17,40,0.08)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] uppercase" style={{ color: MUTED, fontFamily: 'var(--font-jetbrains)' }}>Your results</p>
                    <p className="text-[10px]" style={{ color: GREEN, fontFamily: 'var(--font-jetbrains)' }}>▲ 24%</p>
                  </div>
                  <div className="flex h-24 items-end gap-1.5">
                    {[38, 52, 44, 64, 58, 76, 70, 88, 82, 96, 90, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${h}%`,
                          background: 'linear-gradient(180deg, #6f2ce3, rgba(111,44,227,0.15))',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* lead rows */}
                <div className="space-y-2">
                  {[
                    { n: 'Riverside Bakery',  s: 92, c: GREEN },
                    { n: 'Green Leaf Salon',  s: 87, c: BLUE },
                    { n: 'City Auto Repair',  s: 74, c: PURPLE },
                  ].map((l) => (
                    <div key={l.n} className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2" style={{ borderColor: 'rgba(10,17,40,0.08)' }}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: l.c + '22', color: l.c, fontFamily: 'var(--font-jetbrains)' }}>
                        {l.s}
                      </div>
                      <span className="text-sm" style={{ color: INK }}>{l.n}</span>
                      <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(10,17,40,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${l.s}%`, background: l.c }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating metric card */}
          <div className="glass-card absolute -bottom-8 -right-4 max-w-[240px] animate-bounce rounded-xl p-stack-md" style={{ animationDuration: '3s' }}>
            <div className="mb-2 flex items-center gap-stack-xs">
              <span className="material-symbols-outlined" style={{ color: PURPLE, fontVariationSettings: "'FILL' 1" }}>insights</span>
              <span className="text-[11px] uppercase tracking-wider" style={{ color: PURPLE, fontFamily: 'var(--font-jetbrains)' }}>New customers this month</span>
            </div>
            <h3 className="mb-1 text-lg font-bold" style={{ color: NAVY, fontFamily: 'var(--font-sora)' }}>More every week</h3>
            <p className="text-sm" style={{ color: MUTED }}>People ready to buy, found for your business this month.</p>
          </div>

          {/* Floating badge */}
          <div className="glass-card absolute -left-4 -top-5 flex items-center gap-stack-xs rounded-full px-stack-md py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, #6f2ce3 0%, #884dfd 100%)' }}>
              <span className="material-symbols-outlined text-sm text-white">bolt</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: NAVY, fontFamily: 'var(--font-jetbrains)' }}>Find customers faster</span>
          </div>
        </div>
      </section>

      {/* ── Right: sign-up form ── */}
      <section className="relative z-20 flex min-h-screen w-full flex-col md:w-1/2" style={{ backgroundColor: '#ffffff' }}>
        {/* wordmark */}
        <div className="shrink-0 px-margin-mobile pt-8 md:px-stack-lg md:pt-10 lg:px-[120px]">
          <Link href="/" className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/synq-logo.png" alt="SYNQ" className="h-9 w-8 object-cover object-left" />
            <span className="text-2xl font-extrabold tracking-tight" style={{ color: NAVY, fontFamily: 'var(--font-sora)' }}>SYNQ</span>
          </Link>
        </div>

        {/* form — vertically centered, grows with content */}
        <div className="flex flex-1 items-center justify-center px-margin-mobile py-10 md:px-stack-lg lg:px-[120px]">
        <div className="w-full max-w-[420px]">
          <header className="mb-stack-md">
            <h2 className="mb-stack-xs text-[32px] font-extrabold leading-tight" style={{ color: NAVY, fontFamily: 'var(--font-sora)' }}>{submitted ? 'Request received' : 'Create your free account'}</h2>
            <p className="text-lg" style={{ color: MUTED }}>
              {submitted
                ? 'Thanks — we’ve got your details.'
                : 'Tell us about your business and we’ll get you set up.'}
            </p>
          </header>

          {submitted ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.10)' }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: GREEN, fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
              </div>
              <h3 className="mb-2 text-xl font-bold" style={{ color: NAVY, fontFamily: 'var(--font-sora)' }}>We’ll reach out within 24 hours</h3>
              <p className="text-sm" style={{ color: MUTED }}>
                We’ll email <span style={{ color: INK, fontWeight: 600 }}>{form.email || 'your email'}</span> to help you set up your account. Keep an eye on your inbox.
              </p>
              <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-all hover:bg-black/[0.03]" style={{ borderColor: 'rgba(10,17,40,0.12)', color: INK }}>
                Back to home
              </Link>
            </div>
          ) : (
            <>
              {/* Access-request form */}
              <form className="space-y-stack-md" onSubmit={handleSubmit}>
                <StitchField label="Business name" placeholder="Your business name" value={form.organization} onChange={(v) => update('organization', v)} />
                <StitchField label="Full name" placeholder="Alex Morgan" value={form.name} onChange={(v) => update('name', v)} />
                <StitchField label="Business Email" placeholder="name@company.com" type="email" value={form.email} onChange={(v) => update('email', v)} />
                <StitchField label="Your role" placeholder="e.g. Owner, Manager" value={form.role} onChange={(v) => update('role', v)} />

                {error && <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="glow-button btn-primary flex w-full items-center justify-center gap-stack-xs rounded-lg py-4 text-base font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Submitting request…</>
                  ) : (
                    <>Create your free account<span className="material-symbols-outlined">arrow_forward</span></>
                  )}
                </button>
              </form>

              <footer className="mt-stack-lg text-center">
                <p className="text-sm" style={{ color: MUTED }}>
                  Already have an account? <Link href="/admin/login" className="font-semibold hover:underline" style={{ color: PURPLE }}>Log in</Link>
                </p>
              </footer>
            </>
          )}
        </div>
        </div>

        {/* subtle footer */}
        <div className="shrink-0 px-margin-mobile pb-6 text-center">
          <p className="text-[11px]" style={{ color: '#9a9aa2', fontFamily: 'var(--font-jetbrains)' }}>© {new Date().getFullYear()} SYNQ SYSTEMS INC. ALL RIGHTS RESERVED.</p>
        </div>
      </section>
    </main>
  );
}

function StitchField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] uppercase tracking-wide" style={{ color: '#46464d', fontFamily: 'var(--font-jetbrains)' }}>{label}</label>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-recessed w-full rounded-lg px-stack-md py-3 placeholder:text-[#9a9aa2]"
      />
    </div>
  );
}
