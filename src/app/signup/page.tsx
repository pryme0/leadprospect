'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organization: 'Northstar Growth Co.',
    name: 'Alex Morgan',
    email: 'alex@northstar.example',
    role: 'Growth Lead',
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
    <main className="min-h-screen bg-[#112126] text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1fr,440px]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:py-12">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-[13px] font-black">
              PG
            </span>
            <span className="font-semibold tracking-tight">ProspectGrid</span>
          </Link>

          <div className="max-w-2xl py-16">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#FCEFC3]">
              Create organization
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Start sourcing and scoring leads from every marketing channel.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">
              Create a ProspectGrid workspace for your team, connect ad platforms and CRM sources,
              enrich records, score intent, and route qualified prospects into the right workflow.
            </p>
          </div>

          <div className="grid max-w-3xl gap-3 text-sm text-white/60 sm:grid-cols-3">
            {['Ad source ingestion', 'Lead scoring', 'CRM routing'].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-10">
          <div className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
            <div className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight">Create your workspace</h2>
              <p className="mt-2 text-sm text-white/45">
                This demo stores your organization locally and opens the SaaS console.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Organization" value={form.organization} onChange={(v) => update('organization', v)} />
              <Field label="Full name" value={form.name} onChange={(v) => update('name', v)} />
              <Field label="Work email" type="email" value={form.email} onChange={(v) => update('email', v)} />
              <Field label="Role" value={form.role} onChange={(v) => update('role', v)} />

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#00CEC8] px-4 py-3 text-sm font-bold text-[#112126] transition hover:bg-[#FCEFC3] disabled:opacity-60"
              >
                {loading ? 'Creating workspace...' : 'Create organization'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/40">
              Already have a workspace?{' '}
              <Link href="/admin/login" className="font-semibold text-[#FCEFC3] hover:text-white">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        {label}
      </span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#112126]/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#FCEFC3]/60"
      />
    </label>
  );
}
