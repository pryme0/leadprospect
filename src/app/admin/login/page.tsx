'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

const stats = [
  { label: 'Sources',    value: '5'    },
  { label: 'Leads',      value: '186'  },
  { label: 'Mode',       value: 'Demo' },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]               = useState('admin@prospectgrid.demo');
  const [password, setPassword]         = useState('demo-password');
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
      const res = await adminApi.login({ email, password });
      localStorage.setItem('prospectgrid_admin_token', res.data.token);
      router.replace('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden grid lg:grid-cols-[1.1fr,1fr] bg-[#0B132B]">

      {/* ── Left: editorial brand panel ── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-white/[0.06]">
        {/* Radial glow layers */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(37,99,235,0.22),transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(56,189,248,0.10),transparent_55%)]" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
          }}
        />

        {/* Top — wordmark */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[12px] font-black tracking-tight text-[#0B132B] group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-200">
              PG
            </span>
            <div>
              <p className="text-white font-bold text-[16px] tracking-tight leading-tight">ProspectGrid</p>
              <p className="text-white/35 text-[11px] tracking-wide">Lead intelligence</p>
            </div>
          </Link>
        </div>

        {/* Middle — editorial display */}
        <div className="relative z-10 max-w-md">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-semibold text-[#38BDF8]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#38BDF8]" />
            Multi-source · Organization-ready
          </div>
          <h1 className="font-bold text-white tracking-tight leading-[1.05]" style={{ fontSize: 'clamp(2.25rem, 4vw, 3.25rem)' }}>
            The signal layer
            <br />
            beneath every lead.
          </h1>
          <p className="text-white/45 text-[16px] leading-[1.7] mt-5 max-w-sm">
            Ad sources, CRM records, enriched companies, scoring rules,
            and routing queues — one self-contained workspace.
          </p>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mt-10 max-w-sm">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-[16px] border border-white/10 bg-white/[0.05] px-4 py-4"
              >
                <p className="text-white font-bold text-[22px] tracking-tight tabular-nums">{s.value}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/25 uppercase tracking-[0.22em]">
          <span>v1.0 · console</span>
          <span>secure session</span>
        </div>
      </aside>

      {/* ── Right: form ── */}
      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px]">

          {/* Mobile wordmark */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[12px] font-black text-[#0B132B] group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-200">
                PG
              </span>
              <span className="font-bold text-white text-[16px] tracking-tight">ProspectGrid</span>
            </Link>
          </div>

          {/* Form card */}
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-8 backdrop-blur shadow-[0_20px_60px_rgba(0,0,0,0.30)]">

            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#38BDF8] mb-3">
                Demo workspace
              </p>
              <h2 className="text-white font-bold text-[28px] tracking-tight leading-[1.05]">
                Launch the console.
              </h2>
              <p className="text-white/45 text-[14px] leading-[1.6] mt-3">
                Wired to local demo data — explore every screen without a backend or API keys.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-[12px] border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M12 8v5M12 16h.01" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <LoginField
                label="Email"
                type="email"
                placeholder="admin@prospectgrid.demo"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />

              <LoginField
                label="Password"
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
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] px-6 py-4 text-sm font-semibold text-white transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(37,99,235,0.35)]"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Open demo workspace
                    <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[13px] text-white/30">
            New here?{' '}
            <Link href="/signup" className="font-semibold text-white/60 hover:text-white transition-colors">
              Create a workspace
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function LoginField({
  label,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  right,
}: {
  label: string;
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
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
          {label}
        </span>
        {right}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-[14px] border bg-white/[0.07] px-4 py-3 text-sm text-white outline-none transition-all duration-150 placeholder:text-white/20"
        style={{
          borderColor: focused ? 'rgba(37,99,235,0.70)' : 'rgba(255,255,255,0.10)',
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
        }}
      />
    </label>
  );
}
