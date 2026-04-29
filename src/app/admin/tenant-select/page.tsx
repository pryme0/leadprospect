'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SBUS,
  SbuId,
  setCurrentSbu,
  getCurrentSbu,
  clearCurrentSbu,
} from '@/lib/sbu';

export default function TenantSelectPage() {
  const router = useRouter();
  const [lastUsed, setLastUsed] = useState<SbuId | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('emc_admin_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setLastUsed(getCurrentSbu());
  }, [router]);

  const pick = (id: SbuId) => {
    setCurrentSbu(id);
    router.replace('/admin');
  };

  const signOut = () => {
    localStorage.removeItem('emc_admin_token');
    clearCurrentSbu();
    router.replace('/admin/login');
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#050a14' }}
    >
      <AmbientBackdrop />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6">
        <div
          className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/35"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          LIE / Console
        </div>
        <button
          onClick={signOut}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
        >
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 16l-4-4m0 0l4-4m-4 4h14" />
          </svg>
          Sign out
        </button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-5xl flex-col items-center justify-center px-6 pb-24 pt-12 sm:px-10">
        <div className="mb-14 text-center">
          <p
            className="mb-4 text-[11px] font-medium uppercase tracking-[0.45em] text-white/35"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span className="text-white/55">workspace</span>
            <span className="mx-2 text-white/20">·</span>
            <span>multi-tenant</span>
          </p>
          <h1 className="font-bold text-white text-4xl sm:text-5xl leading-[1.05] tracking-tight">
            Choose a workspace.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/45">
            Each workspace runs its own signals, leads, and dashboard.
            Switch any time from the sidebar.
          </p>
        </div>

        <div className="grid w-full gap-6 sm:grid-cols-2">
          <TenantCard
            tenant={SBUS.emc}
            onClick={() => pick('emc')}
            variant="emci"
            isLastUsed={lastUsed === 'emc'}
          />
          <TenantCard
            tenant={SBUS.lightforth}
            onClick={() => pick('lightforth')}
            variant="lightforth"
            isLastUsed={lastUsed === 'lightforth'}
          />
        </div>
      </main>
    </div>
  );
}

function AmbientBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-1/4 top-1/4 h-[600px] w-[600px] rounded-full opacity-[0.18] blur-3xl"
        style={{ background: 'radial-gradient(circle, #0BAAEF 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full opacity-[0.06] blur-3xl"
        style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(11,170,239,0.3) 50%, transparent 100%)',
        }}
      />
    </>
  );
}

function TenantCard({
  tenant,
  onClick,
  variant,
  isLastUsed,
}: {
  tenant: typeof SBUS[SbuId];
  onClick: () => void;
  variant: 'emci' | 'lightforth';
  isLastUsed: boolean;
}) {
  const isLightforth = variant === 'lightforth';
  const accent = tenant.accent;

  // Lightforth tile uses the rebrand palette — deep navy surface, teal
  // accent rule, orange spotlight glow that echoes the logo lightning bolt.
  const lfHaloColor = '#04947c';
  const lfSpotlight = '#ff5e00';

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border text-left transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#050a14]"
      style={{
        background: isLightforth ? '#08152e' : '#0b1929',
        borderColor: isLightforth ? 'rgba(4,148,124,0.20)' : 'rgba(11,170,239,0.18)',
        boxShadow: isLightforth
          ? '0 1px 0 rgba(4,148,124,0.10) inset'
          : '0 1px 0 rgba(11,170,239,0.08) inset',
        ['--ring-color' as string]: isLightforth ? 'rgba(4,148,124,0.60)' : 'rgba(11,170,239,0.6)',
      }}
    >
      <div
        className="relative h-[140px] w-full overflow-hidden border-b"
        style={{
          background: isLightforth
            ? `radial-gradient(120% 100% at 50% 0%, rgba(4,148,124,0.22) 0%, rgba(4,148,124,0) 60%), radial-gradient(80% 60% at 90% 100%, rgba(255,94,0,0.12) 0%, rgba(255,94,0,0) 70%), #08152e`
            : 'radial-gradient(120% 100% at 50% 0%, rgba(11,170,239,0.22) 0%, rgba(11,170,239,0) 60%), #0b1929',
          borderColor: isLightforth ? 'rgba(4,148,124,0.16)' : 'rgba(11,170,239,0.12)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          {tenant.logoSrc ? (
            <img
              src={tenant.logoSrc}
              alt={`${tenant.name} logo`}
              className="h-14 w-14 object-contain transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold transition-transform duration-500 group-hover:scale-110"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.05em',
              }}
            >
              {tenant.initials}
            </div>
          )}
        </div>

        {isLastUsed && (
          <div
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur"
            style={{
              borderColor: 'rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            Last used
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col gap-5 p-7">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold leading-tight text-white tracking-tight">
            {tenant.name}
          </h2>
          <p
            className="text-[11px] uppercase tracking-[0.25em] text-white/35"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {tenant.tagline}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-white/55">{tenant.description}</p>

        <div
          className="mt-auto flex items-center justify-between border-t pt-5"
          style={{ borderColor: isLightforth ? 'rgba(4,148,124,0.12)' : 'rgba(255,255,255,0.05)' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em] transition-colors"
            style={{ color: isLightforth ? lfHaloColor : accent }}
          >
            Enter workspace
          </span>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 group-hover:translate-x-1"
            style={{
              borderColor: isLightforth ? 'rgba(4,148,124,0.30)' : 'rgba(11,170,239,0.3)',
              background: isLightforth ? 'rgba(4,148,124,0.10)' : 'rgba(11,170,239,0.08)',
              color: isLightforth ? lfHaloColor : accent,
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: isLightforth
            ? `0 30px 80px -20px rgba(4,148,124,0.40), 0 0 0 1px ${lfHaloColor}66 inset`
            : `0 30px 80px -20px rgba(11,170,239,0.35), 0 0 0 1px rgba(11,170,239,0.3) inset`,
        }}
      />
    </button>
  );
}
