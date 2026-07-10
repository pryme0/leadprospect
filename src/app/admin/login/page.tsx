'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Hero (Pexels, free license): a hand holding a phone with a "social media"
// folder open — LinkedIn, Instagram, WhatsApp, Messenger, Telegram, X, Facebook —
// which literally depicts SYNQ's core promise: connect all your social handles
// and reply from one place. The near-black background blends into the midnight
// theme and the dark left gradient. Served compressed & sized via Pexels' CDN
// params (auto=compress, w=1920). Swap the photo id to change the image.
const BRAND_IMAGE =
  "https://images.pexels.com/photos/2818118/pexels-photo-2818118.jpeg?auto=compress&cs=tinysrgb&w=1920";

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
    <main
      className="flex min-h-screen flex-col overflow-hidden md:flex-row"
      style={{ backgroundColor: '#f7f9fb', color: '#46464d' }}
    >

      {/* ── Left: full-bleed brand image with overlaid copy ── */}
      <section className="group relative flex h-64 w-full flex-col justify-between overflow-hidden p-8 md:h-screen md:w-1/2 md:p-12">
        {/* cover image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
        />
        {/* legibility scrim (navy) */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(10,17,40,0.78) 0%, rgba(10,17,40,0.45) 45%, rgba(10,17,40,0.88) 100%)' }}
        />

        {/* wordmark (white on image) */}
        <div className="relative z-10 flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/synq-logo.png" alt="SYNQ" className="h-9 w-8 object-cover object-left" />
          <span className="text-2xl font-extrabold tracking-tight text-white">SYNQ</span>
        </div>

        {/* headline (white on image) */}
        <div className="relative z-10 max-w-md">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#c5b3ff' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#c5b3ff' }}>Welcome back</span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Log in to your account.
          </h1>
          <p className="text-lg leading-relaxed text-white/80">
            Pick up right where you left off — all your customers and conversations in one place.
          </p>
        </div>
      </section>

      {/* ── Right: sign-in form ── */}
      <section
        className="relative flex min-h-screen w-full items-center justify-center p-6 md:w-1/2 md:p-12"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="z-10 w-full max-w-[440px]">
          <div className="mb-8 text-center md:text-left">
            <h2 className="mb-2 text-2xl font-bold" style={{ color: '#0a1128' }}>Welcome back</h2>
            <p className="text-[15px]" style={{ color: '#46464d' }}>Log in to your account to continue.</p>
          </div>

          {/* Social auth — real brand marks, greyed out until sign-in is live */}
          <div className="mb-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Google sign-in coming soon"
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium opacity-60"
              style={{ borderColor: 'rgba(10,17,40,.10)', backgroundColor: '#f7f9fb', color: '#8a8a93' }}
            >
              {/* Official Google "G" logo, desaturated while unavailable */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" style={{ filter: 'grayscale(1)' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="GitHub sign-in coming soon"
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium opacity-60"
              style={{ borderColor: 'rgba(10,17,40,.10)', backgroundColor: '#f7f9fb', color: '#8a8a93' }}
            >
              {/* Official GitHub mark, greyed while unavailable */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#8a8a93" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              <span>GitHub</span>
            </button>
          </div>

          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: 'rgba(10,17,40,.10)' }} /></div>
            <span className="relative bg-white px-4 text-xs font-medium uppercase tracking-widest" style={{ color: '#8a8a93' }}>Or continue with email</span>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(220,38,38,.30)', backgroundColor: 'rgba(220,38,38,.06)', color: '#b91c1c' }}>
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="ml-1 text-sm font-medium" style={{ color: '#46464d' }}>Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: '#8a8a93' }}>alternate_email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="input-recessed h-12 w-full rounded-xl pl-12 pr-4 text-[15px] placeholder:text-[#a0a0a8]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: '#46464d' }}>Password</label>
                <span className="text-xs font-medium" style={{ color: '#6f2ce3' }}>Forgot password?</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: '#8a8a93' }}>key</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="input-recessed h-12 w-full rounded-xl pl-12 pr-12 text-[15px] placeholder:text-[#a0a0a8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-[#0a1128]"
                  style={{ color: '#8a8a93' }}
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2 px-1">
              <input id="remember" type="checkbox" className="h-4 w-4 rounded" style={{ borderColor: 'rgba(10,17,40,.20)', accentColor: '#6f2ce3' }} />
              <label htmlFor="remember" className="select-none text-sm" style={{ color: '#46464d' }}>Keep me signed in</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="glow-button flex h-14 w-full items-center justify-center gap-3 rounded-xl text-base font-semibold text-white active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6f2ce3,#884dfd)' }}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  <span>Log in</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 border-t pt-8 text-center" style={{ borderColor: 'rgba(10,17,40,.10)' }}>
            <p className="text-[15px]" style={{ color: '#46464d' }}>
              New here?{' '}
              <Link href="/signup" className="font-semibold underline-offset-4 hover:underline" style={{ color: '#6f2ce3' }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
