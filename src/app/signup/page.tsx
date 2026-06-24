'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const features = [
  { icon: '⚡', label: 'Ad source ingestion'    },
  { icon: '🎯', label: 'Intent scoring'         },
  { icon: '🔀', label: 'Automated routing'      },
  { icon: '📊', label: 'Live lead graph'        },
  { icon: '🔗', label: '12+ integrations'       },
  { icon: '🛡️', label: 'Duplicate suppression' },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organization: '',
    name: '',
    email: '',
    role: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const now = new Date().toISOString();
    localStorage.setItem('prospectgrid_admin_token', `demo_signup_${Date.now()}`);
    localStorage.setItem(
      'prospectgrid_org_profile',
      JSON.stringify({
        company_name: form.organization,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        created_at: now,
      }),
    );
    localStorage.setItem(
      'prospectgrid_admin_profile',
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
    <main className="min-h-dvh bg-[#F8FAFC]">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-[1fr,460px]">

        {/* ── Left panel ── */}
        <section className="flex flex-col justify-between bg-[#0B132B] px-8 py-10 sm:px-12 lg:py-14">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[12px] font-black tracking-tight text-[#0B132B] group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-200">
              PG
            </span>
            <span className="font-bold text-[17px] tracking-tight text-white">ProspectGrid</span>
          </Link>

          {/* Headline block */}
          <div className="max-w-lg py-14">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#38BDF8]">
              Create your workspace
            </p>
            <h1 className="text-[40px] sm:text-[48px] font-bold tracking-tight text-white leading-[1.1]">
              Start sourcing and scoring leads from every marketing channel.
            </h1>
            <p className="mt-6 text-[17px] leading-[1.7] text-white/55 max-w-md">
              Link your ad accounts, CRM, and forms in minutes. ProspectGrid scores every lead
              and routes your best prospects to the right person — automatically.
            </p>

            {/* Urgency badge */}
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-[#38BDF8]/25 bg-[#38BDF8]/10 px-4 py-2 text-xs font-semibold text-[#38BDF8]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#38BDF8]" />
              Teams connecting today see results in &lt; 24 hours
            </div>
          </div>

          {/* Feature chips */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-w-lg">
            {features.map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/60"
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* ── Right panel: form ── */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-10 bg-[#F8FAFC]">
          <div className="w-full max-w-[400px]">
            <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.08)]">

              <div className="mb-8">
                <h2 className="text-[26px] font-bold tracking-tight text-[#0B132B]">Create your workspace</h2>
                <p className="mt-2 text-sm text-[#64748B]">
                  Free to start. Your leads, scored and ready in minutes.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <Field
                  label="Organization"
                  placeholder="Acme Growth Co."
                  value={form.organization}
                  onChange={(v) => update('organization', v)}
                />
                <Field
                  label="Full name"
                  placeholder="Alex Morgan"
                  value={form.name}
                  onChange={(v) => update('name', v)}
                />
                <Field
                  label="Work email"
                  placeholder="alex@acme.com"
                  type="email"
                  value={form.email}
                  onChange={(v) => update('email', v)}
                />
                <Field
                  label="Role"
                  placeholder="Growth Lead, Head of Sales…"
                  value={form.role}
                  onChange={(v) => update('role', v)}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] px-6 py-4 text-sm font-semibold text-white transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Creating workspace…
                    </>
                  ) : (
                    <>
                      Create organization
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-[#94A3B8]">
                Already have a workspace?{' '}
                <Link href="/admin/login" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Trust note */}
            <p className="mt-5 text-center text-[12px] text-[#94A3B8]">
              No credit card required &middot; Free to start &middot; Cancel anytime
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
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
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#64748B]">
        {label}
      </span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0B132B] outline-none transition-all duration-150 placeholder:text-[#CBD5E1] focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
      />
    </label>
  );
}
