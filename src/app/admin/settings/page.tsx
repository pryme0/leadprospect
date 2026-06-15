'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { INTEGRATIONS } from '@/lib/integrations';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgProfile {
  company_name: string;
  website: string;
  contact_email: string;
  timezone: string;
  logo_url: string;
}

interface AdminProfile {
  display_name: string;
  email: string;
  role: string;
}

type Tab = 'profile' | 'integrations' | 'crm' | 'account';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--a-border)' }}>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-white/30 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-3 gap-4 items-start py-4 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--a-border)' }}>
      <div className="sm:pt-1">
        <p className="text-white/70 text-sm font-medium">{label}</p>
        {hint && <p className="text-white/30 text-xs mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled = false }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00CEC8]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border"
      style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
    />
  );
}

function SaveButton({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all border ${
        saved
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-[#00CEC8]/10 border-[#00CEC8]/30 text-[#00CEC8] hover:bg-[#00CEC8]/15'
      } disabled:opacity-50`}
    >
      {saving ? (
        <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving...</>
      ) : saved ? (
        <>✓ Saved</>
      ) : (
        <>Save Changes</>
      )}
    </button>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
      ok
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {ok ? 'Connected' : 'Not configured'}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [health, setHealth] = useState<any>(null);
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean> | null>(null);

  // Org profile — persisted in localStorage
  const [org, setOrg] = useState<OrgProfile>({
    company_name: 'ProspectGrid',
    website: 'https://prospectgrid.demo',
    contact_email: 'admin@prospectgrid.demo',
    timezone: 'America/New_York',
    logo_url: '',
  });
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Admin profile — read from localStorage token + display settings
  const [admin, setAdmin] = useState<AdminProfile>({
    display_name: 'ProspectGrid Operator',
    email: 'admin@prospectgrid.demo',
    role: 'Admin',
  });
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaved, setAdminSaved] = useState(false);

  // CRM fields — read-only display (from env)
  const CRM_FIELDS = [
    { label: 'Lead Score Field', key: 'CRM_LEAD_SCORE_FIELD_ID' },
    { label: 'Pipeline Value Field', key: 'CRM_PIPELINE_VALUE_FIELD_ID' },
    { label: 'Source Channel Field', key: 'CRM_SOURCE_CHANNEL_FIELD_ID' },
    { label: 'Import File Key Field', key: 'CRM_IMPORT_FILE_KEY_FIELD_ID' },
  ];

  const CRM_WORKFLOWS = [
    { label: 'Hot Account Route', key: 'CRM_ROUTE_HIGH_INTENT', color: 'text-red-400' },
    { label: 'Nurture Route', key: 'CRM_ROUTE_MEDIUM_INTENT', color: 'text-yellow-400' },
    { label: 'Research Route', key: 'CRM_ROUTE_LOW_INTENT', color: 'text-[#00CEC8]' },
    { label: 'Default Route', key: 'CRM_ROUTE_DEFAULT', color: 'text-white/50' },
  ];

  const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Paris',
    'Africa/Lagos', 'Africa/Nairobi', 'Africa/Accra', 'Asia/Dubai', 'UTC',
  ];

  useEffect(() => {
    // Load saved org profile
    const saved = localStorage.getItem('prospectgrid_org_profile');
    if (saved) {
      try { setOrg(JSON.parse(saved)); } catch {}
    }
    const savedAdmin = localStorage.getItem('prospectgrid_admin_profile');
    if (savedAdmin) {
      try { setAdmin(JSON.parse(savedAdmin)); } catch {}
    }

    // Fetch health and integration status from backend
    adminApi.getHealth().then((r) => setHealth(r.data)).catch(() => {});
    adminApi.getIntegrationStatus().then((r) => setIntegrationStatus(r.data)).catch(() => {});
  }, []);

  const saveOrg = () => {
    setOrgSaving(true);
    localStorage.setItem('prospectgrid_org_profile', JSON.stringify(org));
    setTimeout(() => {
      setOrgSaving(false);
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 3000);
    }, 600);
  };

  const saveAdmin = () => {
    setAdminSaving(true);
    localStorage.setItem('prospectgrid_admin_profile', JSON.stringify(admin));
    setTimeout(() => {
      setAdminSaving(false);
      setAdminSaved(true);
      setTimeout(() => setAdminSaved(false), 3000);
    }, 600);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'profile', label: 'Organization', icon: 'Org' },
    { key: 'account', label: 'Admin Account', icon: 'Me' },
    { key: 'integrations', label: 'Integrations', icon: '↔' },
    { key: 'crm', label: 'CRM Routes', icon: '→' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div
        style={{
          background: 'var(--a-card)',
          border: '1px solid var(--a-border)',
          borderRadius: 'var(--t-radius-lg)',
          padding: '18px 24px',
          boxShadow: 'var(--t-card-shadow)',
        }}
      >
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--t-accent)', fontFamily: 'var(--t-mono-font)' }}>
          07 · Workspace controls
        </p>
        <h1 className="text-[22px] font-black tracking-tight" style={{ color: 'var(--t-fg-95)' }}>Settings</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--t-fg-40)' }}>Manage organization details, ad sources, CRM routes, and account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border w-fit" style={{ background: 'var(--a-hover)', borderColor: 'var(--a-border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              tab === t.key
                ? 'shadow-lg'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
            style={tab === t.key ? { background: 'var(--a-card)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' } : {}}
          >
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ORGANIZATION PROFILE TAB ── */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <Section title="Organization Profile" subtitle="Your company details used across the dashboard and reports">
            <Field label="Company Name" hint="Displayed in the admin sidebar">
              <Input
                value={org.company_name}
                onChange={(v) => setOrg({ ...org, company_name: v })}
                placeholder="e.g. ProspectGrid"
              />
            </Field>
            <Field label="Website" hint="Public-facing website URL">
              <Input
                value={org.website}
                onChange={(v) => setOrg({ ...org, website: v })}
                placeholder="https://prospectgrid.demo"
                type="url"
              />
            </Field>
            <Field label="Contact Email" hint="Used for admin notifications">
              <Input
                value={org.contact_email}
                onChange={(v) => setOrg({ ...org, contact_email: v })}
                placeholder="admin@prospectgrid.demo"
                type="email"
              />
            </Field>
            <Field label="Timezone" hint="Used for date formatting across the dashboard">
              <select
                value={org.timezone}
                onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00CEC8]/40 transition-colors border"
                style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-[#0d1b2a]">{tz}</option>
                ))}
              </select>
            </Field>
            <Field label="Logo URL" hint="Optional — URL to your company logo image">
              <Input
                value={org.logo_url}
                onChange={(v) => setOrg({ ...org, logo_url: v })}
                placeholder="https://cdn.example.com/logo.png"
                type="url"
              />
              {org.logo_url && (
                <div className="mt-3 flex items-center gap-3">
                  <img src={org.logo_url} alt="Logo preview" className="h-10 w-auto rounded-lg border border-white/10 object-contain bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-white/30 text-xs">Logo preview</span>
                </div>
              )}
            </Field>
          </Section>

          <div className="flex justify-end">
            <SaveButton onClick={saveOrg} saving={orgSaving} saved={orgSaved} />
          </div>
        </div>
      )}

      {/* ── ADMIN ACCOUNT TAB ── */}
      {tab === 'account' && (
        <div className="space-y-4">
          <Section title="Admin Account" subtitle="Your personal admin profile and display settings">
            <Field label="Display Name" hint="Name shown in the sidebar and reports">
              <Input
                value={admin.display_name}
                onChange={(v) => setAdmin({ ...admin, display_name: v })}
                placeholder="e.g. ProspectGrid Operator"
              />
            </Field>
            <Field label="Admin Email" hint="Login email — change via server environment variable ADMIN_EMAIL">
              <Input
                value={admin.email}
                onChange={(v) => setAdmin({ ...admin, email: v })}
                placeholder="admin@prospectgrid.demo"
                type="email"
              />
            </Field>
            <Field label="Role" hint="Access level — currently fixed to Admin">
              <div className="flex items-center gap-2">
                <Input value="Admin" disabled />
                <span className="text-xs px-2.5 py-1.5 rounded-lg bg-[#00CEC8]/10 text-[#00CEC8] border border-[#00CEC8]/20 whitespace-nowrap">
                  Full Access
                </span>
              </div>
            </Field>
          </Section>

          <Section title="Password" subtitle="Admin password is managed via server environment variables">
            <div className="flex items-start gap-4 p-4 rounded-xl border" style={{ background: 'var(--a-hover)', borderColor: 'var(--a-border)' }}>
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0 text-yellow-400 text-sm">
                ⚠
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">Password changes require server access</p>
                <p className="text-white/30 text-xs mt-1">
                  Update <code className="text-[#00CEC8] bg-[#00CEC8]/10 px-1 py-0.5 rounded text-[10px]">ADMIN_PASSWORD</code> in your <code className="text-[#00CEC8] bg-[#00CEC8]/10 px-1 py-0.5 rounded text-[10px]">.env</code> file and restart the backend to change your password.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Session" subtitle="Current session information">
            <Field label="Token Storage" hint="JWT stored in browser localStorage">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
                <span className="text-white/30 text-xs">24-hour expiry</span>
              </div>
            </Field>
            <Field label="Sign Out" hint="Invalidates your local session token">
              <button
                onClick={() => {
                  localStorage.removeItem('prospectgrid_admin_token');
                  window.location.href = '/admin/login';
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out Now
              </button>
            </Field>
          </Section>

          <div className="flex justify-end">
            <SaveButton onClick={saveAdmin} saving={adminSaving} saved={adminSaved} />
          </div>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {tab === 'integrations' && (
        <div className="space-y-4">
          <Section title="Source Integrations" subtitle="Open each connector to inspect pulled data, mappings, outcomes, and sync controls">
            <div className="grid md:grid-cols-2 gap-3">
              {INTEGRATIONS.map((integration) => (
                <Link
                  key={integration.key}
                  href={`/admin/integrations/${integration.id}`}
                  className="group flex items-center justify-between gap-4 p-4 border transition-colors"
                  style={{
                    background: 'var(--a-card2)',
                    borderColor: 'var(--a-border)',
                    borderRadius: 'var(--t-radius-sm)',
                    boxShadow: 'var(--t-card-shadow)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: `${integration.accent}12`, borderColor: `${integration.accent}30`, color: integration.accent }}
                    >
                      {integration.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/80 text-sm font-medium">{integration.label}</p>
                      <p className="text-white/30 text-xs">{integration.description}</p>
                      <code className="mt-2 block text-white/25 text-[10px] font-mono">{integration.key}</code>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {integrationStatus === null ? (
                      <span className="inline-block w-20 h-6 rounded-full bg-white/5 animate-pulse" />
                    ) : (
                      <StatusDot ok={integrationStatus[integration.key] === true} />
                    )}
                    <span className="text-[10px] uppercase tracking-[0.18em] transition-colors" style={{ color: 'var(--t-fg-35)' }}>
                      Open
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="System Health" subtitle="Live backend status">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${health ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'} animate-pulse`} />
                <div>
                  <p className="text-white/70 text-sm font-medium">
                    {health ? 'Backend Online' : 'Backend Offline'}
                  </p>
                  {health && (
                    <p className="text-white/30 text-xs">
                      v{health.version} · {new Date(health.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => adminApi.getHealth().then((r) => setHealth(r.data)).catch(() => setHealth(null))}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white/70 border border-white/5 transition-colors"
              >
                Refresh
              </button>
            </div>
          </Section>

          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex items-start gap-3">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-yellow-400/50 text-yellow-400 text-[10px] leading-[14px] text-center">!</span>
            <div>
              <p className="text-yellow-400 text-sm font-medium">Changing API keys requires server restart</p>
              <p className="text-white/40 text-xs mt-1">
                Edit your <code className="text-[#00CEC8] bg-[#00CEC8]/10 px-1 py-0.5 rounded text-[10px]">.env</code> file on the server and restart with <code className="text-[#00CEC8] bg-[#00CEC8]/10 px-1 py-0.5 rounded text-[10px]">npm run start:dev</code> to apply changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CRM ROUTES TAB ── */}
      {tab === 'crm' && (
        <div className="space-y-4">
          <Section title="CRM Connection" subtitle="Destination routing for qualified leads">
            <Field label="Route Layer" hint="Lead routing adapter used by connected CRMs">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1.5 rounded-lg bg-[#00CEC8]/10 text-[#00CEC8] border border-[#00CEC8]/20 font-mono">
                  ProspectGrid Routing API v1
                </span>
              </div>
            </Field>
            <Field label="Workspace ID" hint="Demo workspace used for local CRM routing">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={{ background: 'var(--a-hover)', borderColor: 'var(--a-border2)' }}>
                <code className="text-white/50 text-sm font-mono tracking-wide">pg_demo_workspace_01</code>
                <button
                  onClick={() => navigator.clipboard.writeText('pg_demo_workspace_01')}
                  className="ml-auto text-white/30 hover:text-white/60 transition-colors"
                  title="Copy"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </Field>
          </Section>

          <Section title="Custom Fields" subtitle="CRM custom field IDs mapped from lead data">
            <div className="space-y-0">
              {CRM_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white/70 text-sm">{f.label}</p>
                    <code className="text-white/25 text-[10px] font-mono">{f.key}</code>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-[#00CEC8] border border-white/8 font-mono">
                    Configured
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Routing Playbooks" subtitle="Intent-based CRM routes triggered on lead creation">
            <div className="space-y-0">
              {CRM_WORKFLOWS.map((w) => (
                <div key={w.key} className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className={`text-sm font-medium ${w.color}`}>{w.label}</p>
                    <code className="text-white/25 text-[10px] font-mono">{w.key}</code>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-emerald-400 border border-white/8 font-mono">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Sync Behaviour" subtitle="How qualified leads are synced to CRM">
            <div className="space-y-3">
              {[
                { label: 'Sync timing', value: 'Immediate — within 5 seconds of capture or import' },
                { label: 'Retry attempts', value: '3 attempts with exponential backoff (2s → 4s → 8s)' },
                { label: 'Queue', value: 'CRM routing queue with retry and failed-job visibility' },
                { label: 'Deduplication', value: 'Email, domain, and CRM record checks before creating a new contact' },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-6 py-3 border-b border-white/5 last:border-0">
                  <p className="text-white/40 text-sm shrink-0">{item.label}</p>
                  <p className="text-white/70 text-sm text-right">{item.value}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="flex justify-between items-center p-4 rounded-xl border" style={{ background: 'var(--a-hover)', borderColor: 'var(--a-border)' }}>
            <div>
              <p className="text-white/60 text-sm font-medium">Bull Board Queue Monitor</p>
              <p className="text-white/30 text-xs">View live CRM routing jobs, retries, and failed jobs</p>
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#00CEC8]/10 border border-[#00CEC8]/30 text-[#00CEC8] hover:bg-[#00CEC8]/15 transition-colors whitespace-nowrap"
            >
              Open Queue Monitor ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
