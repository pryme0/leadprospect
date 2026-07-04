'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organization: '',
    name: '',
    email: '',
    role: '',
  });
  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const now = new Date().toISOString();
    localStorage.setItem('synq_admin_token', `demo_signup_${Date.now()}`);
    localStorage.setItem(
      'synq_org_profile',
      JSON.stringify({
        company_name: form.organization,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        created_at: now,
      }),
    );
    localStorage.setItem(
      'synq_admin_profile',
      JSON.stringify({
        name: form.name,
        email: form.email,
        role: form.role,
        created_at: now,
      }),
    );

    window.setTimeout(() => router.replace('/admin'), 450);
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
                <span className="ml-3 font-mono-label text-mono-label uppercase tracking-wider text-outline">Lead Intelligence Suite</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-tertiary/10 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
                  <span className="font-mono-label text-[10px] uppercase text-tertiary">Live</span>
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* KPI tiles */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: 'Active Leads', v: '1,245', c: 'text-white' },
                    { k: 'High Intent',  v: '85%',   c: 'text-tertiary' },
                    { k: 'Routed',       v: '312',   c: 'text-secondary' },
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
                    <p className="font-mono-label text-[10px] uppercase text-outline">Revenue Analytics</p>
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
                    { n: 'Global Dynamics', s: 92, c: '#00e299' },
                    { n: 'Quantum Tech',    s: 87, c: '#1fd8ff' },
                    { n: 'Nexus Systems',   s: 74, c: '#6d5ef9' },
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
              <span className="font-mono-label text-mono-label uppercase tracking-wider text-tertiary">Live Signal Processing</span>
            </div>
            <h3 className="mb-1 font-display-lg text-display-lg text-white">8,400+</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Intent signals captured this month across your enterprise accounts.</p>
          </div>

          {/* Floating badge */}
          <div className="glass-card absolute -left-4 -top-5 flex items-center gap-stack-xs rounded-full px-stack-md py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
              <span className="material-symbols-outlined text-sm text-white">bolt</span>
            </div>
            <span className="font-mono-label text-mono-label font-bold text-on-surface">ACCELERATED REVENUE ENGINE</span>
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
            <h2 className="mb-stack-xs font-display-lg text-display-lg text-white">Create your workspace</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Join 500+ high-growth teams using SYNQ to capture revenue intent.
            </p>
          </header>

          {/* Social auth (decorative) */}
          <div className="mb-stack-md grid grid-cols-2 gap-stack-xs">
            <button type="button" className="glass-card flex items-center justify-center gap-stack-xs rounded-lg px-4 py-3 font-body-md text-on-surface transition-all hover:bg-white/5 active:scale-95">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.32-2.12 4.52-1.2 1.2-2.84 2.12-5.72 2.12-4.24 0-7.72-3.44-7.72-7.72s3.48-7.72 7.72-7.72c2.4 0 4.2 1 5.52 2.24l2.32-2.32C18.48 3.52 15.68 2 12.48 2 6.68 2 2 6.68 2 12.48s4.68 10.48 10.48 10.48c3.12 0 5.52-1.04 7.4-2.92 1.96-1.92 2.56-4.68 2.56-6.92 0-.64-.04-1.28-.12-1.92h-9.84z" /></svg>
              Google
            </button>
            <button type="button" className="glass-card flex items-center justify-center gap-stack-xs rounded-lg px-4 py-3 font-body-md text-on-surface transition-all hover:bg-white/5 active:scale-95">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a2.7 2.7 0 0 0-2.7-2.7c-1.2 0-1.8.6-2.1 1.1v-1h-2.5v7.9h2.5v-4.1c0-.2 0-.5.1-.7.2-.4.5-.8 1.1-.8.7 0 1 .6 1 1.4v4.2h2.5M7 19h2.5V11H7v8m1.2-9.2A1.4 1.4 0 1 0 7 8.4a1.4 1.4 0 0 0 1.2 1.4z" /></svg>
              LinkedIn
            </button>
          </div>

          <div className="relative mb-stack-md flex items-center py-stack-xs">
            <div className="flex-grow border-t border-glass-stroke" />
            <span className="mx-4 flex-shrink font-mono-label text-mono-label uppercase tracking-widest text-outline">Or continue with email</span>
            <div className="flex-grow border-t border-glass-stroke" />
          </div>

          {/* Registration form (functionality preserved) */}
          <form className="space-y-stack-md" onSubmit={handleSubmit}>
            <StitchField
              label="Organization"
              placeholder="Acme Growth Co."
              value={form.organization}
              onChange={(v) => update('organization', v)}
            />
            <StitchField
              label="Full name"
              placeholder="Alex Morgan"
              value={form.name}
              onChange={(v) => update('name', v)}
            />
            <StitchField
              label="Business Email"
              placeholder="name@company.com"
              type="email"
              value={form.email}
              onChange={(v) => update('email', v)}
            />
            <StitchField
              label="Role"
              placeholder="Growth Lead, Head of Sales…"
              value={form.role}
              onChange={(v) => update('role', v)}
            />

            <div className="flex items-start gap-stack-xs">
              <input id="terms" type="checkbox" className="mt-1 h-4 w-4 rounded border-glass-stroke bg-deep-obsidian text-primary-container focus:ring-primary-container" />
              <label htmlFor="terms" className="font-body-md text-body-md leading-tight text-on-surface-variant">
                I agree to the <Link href="/privacy" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glow-button flex w-full items-center justify-center gap-stack-xs rounded-lg bg-primary-container py-4 font-headline-md text-headline-md text-on-primary-container transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating workspace…
                </>
              ) : (
                <>
                  Get Started
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <footer className="mt-stack-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have a workspace? <Link href="/admin/login" className="font-semibold text-primary hover:underline">Log In</Link>
            </p>
          </footer>
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
