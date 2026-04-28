'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TENANTS, TenantId, setCurrentTenant } from '@/lib/tenant';

export default function TenantSelectPage() {
  const router = useRouter();

  // Gate: must be logged in to pick a tenant.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('emc_admin_token');
    if (!token) router.replace('/admin/login');
  }, [router]);

  const pick = (id: TenantId) => {
    setCurrentTenant(id);
    router.replace('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: '#050a14' }}
    >
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-3">Workspace</p>
          <h1 className="text-white font-bold text-3xl mb-2">Choose your workspace</h1>
          <p className="text-white/40 text-sm">
            Each workspace has its own signals, leads, and dashboard.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <TenantCard
            tenant={TENANTS.EMCI}
            onClick={() => pick('EMCI')}
            variant="emci"
          />
          <TenantCard
            tenant={TENANTS.LIGHTFORTH}
            onClick={() => pick('LIGHTFORTH')}
            variant="lightforth"
          />
        </div>

        <p className="text-center text-white/30 text-xs mt-10">
          You can switch between workspaces at any time from the top bar.
        </p>
      </div>
    </div>
  );
}

function TenantCard({
  tenant,
  onClick,
  variant,
}: {
  tenant: typeof TENANTS[TenantId];
  onClick: () => void;
  variant: 'emci' | 'lightforth';
}) {
  // EMCI = blue-accented dark surface (matches its dashboard).
  // Lightforth = pure black surface with white type (matches its dashboard).
  const isLightforth = variant === 'lightforth';

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border p-8 text-left transition-all hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a14] focus-visible:ring-white/40"
      style={{
        background: isLightforth ? '#000000' : '#0d1e30',
        borderColor: isLightforth ? 'rgba(255,255,255,0.15)' : 'rgba(11,170,239,0.25)',
      }}
    >
      {/* Glow accent */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ background: isLightforth ? '#ffffff' : '#0BAAEF' }}
      />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          {tenant.logoSrc ? (
            <img
              src={tenant.logoSrc}
              alt={`${tenant.name} logo`}
              className="w-12 h-12 object-contain shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
              style={{
                background: isLightforth ? 'rgba(255,255,255,0.08)' : 'rgba(11,170,239,0.15)',
                color: isLightforth ? '#ffffff' : '#0BAAEF',
                border: isLightforth ? '1px solid rgba(255,255,255,0.12)' : 'none',
              }}
            >
              {tenant.initials}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-white font-bold text-xl leading-tight">{tenant.name}</h2>
            <p className="text-white/40 text-xs mt-0.5">{tenant.tagline}</p>
          </div>
        </div>

        <p className="text-white/60 text-sm leading-relaxed">{tenant.description}</p>

        <div className="flex items-center justify-between pt-2">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: isLightforth ? 'rgba(255,255,255,0.7)' : '#0BAAEF' }}
          >
            Enter workspace
          </span>
          <svg
            className="w-5 h-5 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: isLightforth ? '#ffffff' : '#0BAAEF' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </button>
  );
}
