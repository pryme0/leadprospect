'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BRAND_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBq7RRn6A_9vewcVKW6ZEvxg8abZPEY_PX1_QdzwcvLsI_X1s9SZFQdGNDdpD0Ik_Nkn1rykRptrK0aYrUqGcRJiALzL8KL3FykGGJV_J4QHXu4ZB6OTcLO7NLexa1bB-MN3qoGufF5JIGMd-cPQ68fn4Osw1u3GDMbFq4fYkd7f4H5oT72NuBEIx3lwn4P371de8pEv-rQ-nCqHRPGSs74IvzO3sz6GfYhbKNC85wUFEuH0SrLmiqWBvszsdHnHKOEPWXETZqJDFMs";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are both required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Invalid credentials.');
        return;
      }
      localStorage.setItem('synq_admin_token', data.token);
      localStorage.setItem('synq_admin_user', JSON.stringify(data.user));
      // Super admins manage the whole platform, not a single org workspace.
      router.replace(data.user?.role === 'superadmin' ? '/admin/platform' : '/admin');
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-midnight text-on-surface selection:bg-primary-container selection:text-white md:flex-row">

      {/* ── Left: branding / lifestyle ── */}
      <section className="group relative h-64 w-full overflow-hidden md:h-screen md:w-1/2">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{ backgroundImage: `url('${BRAND_IMAGE}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-midnight/90 via-midnight/60 to-transparent" />
          <div className="absolute inset-0 bg-primary-container/20 mix-blend-multiply" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-margin-desktop">
          {/* wordmark */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container shadow-lg shadow-primary-container/30">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
            </div>
            <span className="font-display-lg text-display-lg font-bold tracking-tighter text-white">SYNQ</span>
          </div>

          {/* headline */}
          <div className="max-w-md animate-fade-in">
            <div className="mb-stack-xs flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary" />
              <span className="font-mono-label text-mono-label uppercase tracking-widest text-tertiary">System Ready</span>
            </div>
            <h1 className="mb-stack-md font-display-xl text-display-xl leading-none text-white">
              Initialize Session.
            </h1>
            <p className="font-body-lg text-body-lg italic leading-relaxed text-on-surface-variant/80">
              &ldquo;Welcome back to the command center. Your intelligence streams are synchronized and waiting.&rdquo;
            </p>
          </div>

          {/* tech specs */}
          <div className="hidden gap-gutter md:flex">
            <div className="glass-card rounded-lg px-4 py-2">
              <p className="font-mono-label text-[10px] uppercase text-outline">Network Status</p>
              <p className="font-mono-data text-tertiary">ENCRYPTED // L2</p>
            </div>
            <div className="glass-card rounded-lg px-4 py-2">
              <p className="font-mono-label text-[10px] uppercase text-outline">Uptime</p>
              <p className="font-mono-data text-white">99.998%</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Right: sign-in form ── */}
      <section className="relative flex min-h-screen w-full items-center justify-center bg-deep-obsidian p-margin-mobile md:w-1/2 md:p-margin-desktop">
        <div className="mesh-gradient-overlay pointer-events-none absolute inset-0" />

        <div className="z-10 w-full max-w-[440px]">
          <div className="mb-stack-lg text-center md:text-left">
            <h2 className="mb-2 font-headline-md text-headline-md text-white">Access Portal</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Authenticate to enter the intelligence suite.</p>
          </div>

          {/* Social auth (decorative) */}
          <div className="mb-stack-lg grid grid-cols-2 gap-stack-xs">
            <button type="button" className="glass-card flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all hover:bg-surface-variant/20 active:scale-[0.98]">
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.152-1.928 4.176-1.224 1.224-3.136 2.52-6.528 2.52-5.416 0-9.616-4.384-9.616-9.8s4.2-9.8 9.616-9.8c3.152 0 5.424 1.232 7.024 2.744l2.312-2.312C18.816 1.152 16.032 0 12.48 0 5.64 0 0 5.64 0 12.48s5.64 12.48 12.48 12.48c3.704 0 6.496-1.224 8.704-3.528 2.272-2.272 2.992-5.488 2.992-8.112 0-.784-.048-1.536-.16-2.288z" fill="currentColor" /></svg>
              <span className="font-mono-label text-mono-label">GOOGLE</span>
            </button>
            <button type="button" className="glass-card flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all hover:bg-surface-variant/20 active:scale-[0.98]">
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fill="currentColor" /></svg>
              <span className="font-mono-label text-mono-label">GITHUB</span>
            </button>
          </div>

          <div className="relative mb-stack-lg flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-stroke" /></div>
            <span className="relative bg-deep-obsidian px-4 font-mono-label text-mono-label uppercase tracking-widest text-outline">Or Secure Login</span>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-stack-md">
            {/* Email */}
            <div className="space-y-2">
              <label className="ml-1 font-mono-label text-mono-label uppercase text-outline">Institutional Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline">alternate_email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="input-recessed h-12 w-full rounded-xl pl-12 pr-4 font-body-md text-on-surface placeholder:text-outline/50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label className="font-mono-label text-mono-label uppercase text-outline">Access Key</label>
                <span className="font-mono-label text-[10px] uppercase tracking-tighter text-primary">Recover Keys?</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-outline">key</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="input-recessed h-12 w-full rounded-xl pl-12 pr-12 font-body-md text-on-surface placeholder:text-outline/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2 px-1">
              <input id="remember" type="checkbox" className="h-4 w-4 rounded border-outline-variant bg-deep-obsidian text-primary-container focus:ring-primary/20" />
              <label htmlFor="remember" className="select-none font-mono-label text-mono-label text-on-surface-variant">Remember terminal authorization</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="glow-button flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary-container font-headline-md text-body-lg text-white active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Authenticating…
                </>
              ) : (
                <>
                  <span>Initialize Command</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-stack-lg border-t border-glass-stroke pt-stack-lg text-center">
            <p className="font-body-md text-body-md text-outline">
              New terminal operative?{' '}
              <Link href="/signup" className="font-semibold text-tertiary underline-offset-4 hover:underline decoration-tertiary/30">
                Request Access
              </Link>
            </p>
          </div>
        </div>

        {/* floating decoration */}
        <div className="pointer-events-none absolute bottom-margin-desktop left-1/2 flex -translate-x-1/2 items-center gap-6 opacity-30">
          <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">SYNQ SYSTEMS v4.0.2</span>
          <span className="h-1 w-1 rounded-full bg-outline" />
          <span className="font-mono-label text-[10px] uppercase tracking-widest text-outline">SECURE LAYER ACTIVE</span>
        </div>
      </section>
    </main>
  );
}
