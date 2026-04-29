'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { clearCurrentSbu } from '@/lib/sbu';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are both required.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.login({ email, password });
      localStorage.setItem('emc_admin_token', res.data.token);
      clearCurrentSbu();
      router.replace('/admin/tenant-select');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Login is pre-tenant — render in EMCI's editorial-dark vocabulary by default.
  return (
    <div
      className="relative min-h-screen overflow-hidden grid lg:grid-cols-[1.1fr,1fr]"
      style={{ background: '#050a14' }}
    >
      {/* ── Left: editorial brand panel (desktop only) ── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-white/[0.05]">
        {/* Ambient backdrop */}
        <div
          className="pointer-events-none absolute -left-1/3 top-1/3 h-[700px] w-[700px] rounded-full blur-3xl opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, #0BAAEF 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--t-fg-55) 1px, transparent 0)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
          }}
        />

        {/* Top — wordmark */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/emclogo.png" alt="" className="h-8 w-8 object-contain" />
          <div>
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-white/40"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              LIE / Console
            </p>
            <p className="text-white text-sm font-semibold tracking-tight leading-tight">
              Lead intelligence engine
            </p>
          </div>
        </div>

        {/* Middle — editorial display */}
        <div className="relative z-10 max-w-md">
          <p
            className="text-[10px] uppercase tracking-[0.4em] text-white/45 mb-5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span className="text-[#0BAAEF]">●</span> &nbsp; Multi-tenant · multi-source
          </p>
          <h1 className="font-bold text-white tracking-tight leading-[1.04]" style={{ fontSize: 'clamp(2.25rem, 4vw, 3.4rem)' }}>
            The signal layer
            <br />
            beneath every lead.
          </h1>
          <p className="text-white/45 text-sm leading-relaxed mt-5 max-w-sm">
            Twitter, Reddit, YouTube, and Google — refined by Claude into intent,
            urgency, and pain points. One console for every workspace you run.
          </p>

          {/* Micro stats strip */}
          <div className="grid grid-cols-3 gap-px mt-10 max-w-sm" style={{ background: 'var(--t-fg-06)' }}>
            {[
              { ord: '01', label: 'Sources', value: '4' },
              { ord: '02', label: 'Tenants', value: '2' },
              { ord: '03', label: 'Models', value: 'Claude' },
            ].map((s) => (
              <div key={s.ord} className="px-4 py-4" style={{ background: '#050a14' }}>
                <span
                  className="text-[9px] tracking-[0.3em] tabular-nums text-white/30"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {s.ord}
                </span>
                <p className="text-white font-bold text-lg tracking-tight mt-1 tabular-nums">
                  {s.value}
                </p>
                <p
                  className="text-[10px] uppercase tracking-[0.18em] text-white/40 mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — fine print */}
        <div className="relative z-10 flex items-center justify-between text-[10px] text-white/30 uppercase tracking-[0.25em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span>v1.0 · console</span>
          <span>secure session</span>
        </div>
      </aside>

      {/* ── Right: form ── */}
      <main className="relative flex items-center justify-center p-6 sm:p-10">
        {/* Mobile-only ambient backdrop */}
        <div
          className="pointer-events-none absolute inset-0 lg:hidden opacity-[0.10]"
          style={{ background: 'radial-gradient(circle at 50% 30%, #0BAAEF 0%, transparent 60%)' }}
        />

        <div className="relative w-full max-w-sm">
          {/* Mobile wordmark */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/emclogo.png" alt="" className="h-7 w-7 object-contain" />
            <p
              className="text-[10px] tracking-[0.4em] uppercase text-white/45"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              LIE / Console
            </p>
          </div>

          <div className="mb-9">
            <p
              className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Sign in
            </p>
            <h2 className="text-white font-bold text-3xl sm:text-4xl tracking-tight leading-[1.05]">
              Welcome back.
            </h2>
            <p className="text-white/45 text-sm mt-3">
              Enter your admin credentials to access the console.
            </p>
          </div>

          {error && (
            <div
              className="mb-6 px-4 py-3 text-sm flex items-start gap-3"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.20)',
                color: '#fca5a5',
                borderRadius: 'var(--t-radius-sm, 8px)',
              }}
            >
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 8v5M12 16h.01" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field
              label="Email"
              ord="01"
              type="email"
              placeholder="admin@excelmindcyber.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />

            <Field
              label="Password"
              ord="02"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              right={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-white/35 hover:text-white/80 transition-colors text-[10px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#0BAAEF',
                color: '#050a14',
                borderRadius: '8px',
                boxShadow: '0 0 0 1px rgba(11,170,239,0.3), 0 12px 32px -12px rgba(11,170,239,0.5)',
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M5 12h14m-6-7l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="text-white/30 text-[11px] mt-8 leading-relaxed">
            Sessions are secured with a JWT bearer. Lost access?{' '}
            <span className="text-white/55">Contact the workspace owner.</span>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, ord, type, placeholder, value, onChange, autoComplete, right,
}: {
  label: string;
  ord: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2">
          <span
            className="text-[9px] tracking-[0.3em] tabular-nums text-white/30"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {ord}
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.25em] text-white/55 font-medium"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {label}
          </span>
        </span>
        {right}
      </div>
      <div
        className="relative transition-all"
        style={{
          background: 'var(--t-fg-02)',
          borderBottom: `1px solid ${focused ? '#0BAAEF' : 'var(--t-fg-10)'}`,
        }}
      >
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent px-1 py-3 text-white text-base focus:outline-none placeholder:text-white/25"
        />
      </div>
    </label>
  );
}
