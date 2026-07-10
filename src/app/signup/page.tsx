'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-midnight font-body-md text-on-surface antialiased md:flex-row">

      {/* ── Left: visual showcase ── */}
      <section className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-deep-obsidian p-gutter md:sticky md:top-0 md:flex md:h-screen">
        <div className="absolute right-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-primary-container/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-tertiary/10 blur-[100px]" />

        <div className="relative z-10 w-full max-w-lg rotate-1 shadow-2xl transition-transform duration-700 hover:rotate-0">
          {/* Self-contained CSS dashboard mock (no external image dependency) */}
          <div className="glass-card overflow-hidden rounded-xl p-2">
            <div className="overflow-hidden rounded-lg bg-deep-obsidian">
              {/* window bar */}
              <div className="flex items-center gap-2 border-b border-glass-stroke px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono-label text-mono-label uppercase tracking-wider text-outline">Your SYNQ account</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-tertiary/10 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
                  <span className="font-mono-label text-[10px] uppercase text-tertiary">Live</span>
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* KPI tiles */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: 'New customers', v: '1,245', c: 'text-white' },
                    { k: 'Ready to buy', v: '85%',   c: 'text-tertiary' },
                    { k: 'Sent to you',  v: '312',   c: 'text-secondary' },
                  ].map((t) => (
                    <div key={t.k} className="rounded-lg border border-glass-stroke bg-white/[0.02] p-3">
                      <p className="font-mono-label text-[10px] uppercase text-outline">{t.k}</p>
                      <p className={`mt-1 font-display-lg text-xl font-bold ${t.c}`}>{t.v}</p>
                    </div>
                  ))}
                </div>

                {/* faux bar chart */}
                <div className="rounded-lg border border-glass-stroke bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono-label text-[10px] uppercase text-outline">Your results</p>
                    <p className="font-mono-label text-[10px] text-tertiary">▲ 24%</p>
                  </div>
                  <div className="flex h-24 items-end gap-1.5">
                    {[38, 52, 44, 64, 58, 76, 70, 88, 82, 96, 90, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${h}%`,
                          background: 'linear-gradient(180deg, #6d5ef9, rgba(109,94,249,0.15))',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* lead rows */}
                <div className="space-y-2">
                  {[
                    { n: 'Riverside Bakery',  s: 92, c: '#00e299' },
                    { n: 'Green Leaf Salon',  s: 87, c: '#1fd8ff' },
                    { n: 'City Auto Repair',  s: 74, c: '#6d5ef9' },
                  ].map((l) => (
                    <div key={l.n} className="flex items-center gap-3 rounded-lg border border-glass-stroke bg-white/[0.02] px-3 py-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full font-mono-label text-[10px] font-bold text-white" style={{ background: l.c + '33', color: l.c }}>
                        {l.s}
                      </div>
                      <span className="font-body-md text-sm text-on-surface">{l.n}</span>
                      <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
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
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
              <span className="font-mono-label text-mono-label uppercase tracking-wider text-tertiary">New customers this month</span>
            </div>
            <h3 className="mb-1 font-display-lg text-display-lg text-white">More every week</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">People ready to buy, found for your business this month.</p>
          </div>

          {/* Floating badge */}
          <div className="glass-card absolute -left-4 -top-5 flex items-center gap-stack-xs rounded-full px-stack-md py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
              <span className="material-symbols-outlined text-sm text-white">bolt</span>
            </div>
            <span className="font-mono-label text-mono-label font-bold text-on-surface">Find customers faster</span>
          </div>
        </div>
      </section>

      {/* ── Right: sign-up form ── */}
      <section className="relative z-20 flex min-h-screen w-full flex-col bg-midnight md:w-1/2">
        {/* wordmark */}
        <div className="shrink-0 px-margin-mobile pt-8 md:px-stack-lg md:pt-10 lg:px-[120px]">
          <Link href="/" className="font-display-lg text-display-lg font-bold tracking-tighter text-primary">SYNQ</Link>
        </div>

        {/* form — vertically centered, grows with content */}
        <div className="flex flex-1 items-center justify-center px-margin-mobile py-10 md:px-stack-lg lg:px-[120px]">
        <div className="w-full max-w-[420px]">
          <header className="mb-stack-md">
            <h2 className="mb-stack-xs font-display-lg text-display-lg text-white">{submitted ? 'Request received' : 'Create your free account'}</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {submitted
                ? 'Thanks — we’ve got your details.'
                : 'Tell us about your business and we’ll get you set up.'}
            </p>
          </header>

          {submitted ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/20">
                <span className="material-symbols-outlined text-3xl text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
              </div>
              <h3 className="mb-2 font-display-lg text-xl text-white">We’ll reach out within 24 hours</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                We’ll email <span className="text-white">{form.email || 'your email'}</span> to help you set up your account. Keep an eye on your inbox.
              </p>
              <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg border border-glass-stroke px-5 py-2.5 font-body-md text-on-surface transition-all hover:bg-white/5">
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

                {error && <p className="font-body-md text-body-md text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="glow-button flex w-full items-center justify-center gap-stack-xs rounded-lg bg-primary-container py-4 font-headline-md text-headline-md text-on-primary-container transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Submitting request…</>
                  ) : (
                    <>Create your free account<span className="material-symbols-outlined">arrow_forward</span></>
                  )}
                </button>
              </form>

              <footer className="mt-stack-lg text-center">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Already have an account? <Link href="/admin/login" className="font-semibold text-primary hover:underline">Log in</Link>
                </p>
              </footer>
            </>
          )}
        </div>
        </div>

        {/* subtle footer */}
        <div className="shrink-0 px-margin-mobile pb-6 text-center opacity-20">
          <p className="font-mono-label text-mono-label">© {new Date().getFullYear()} SYNQ SYSTEMS INC. ALL RIGHTS RESERVED.</p>
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
      <label className="mb-2 block font-mono-label text-mono-label uppercase text-on-surface-variant">{label}</label>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-recessed w-full rounded-lg px-stack-md py-3 text-on-surface placeholder:text-outline"
      />
    </div>
  );
}
