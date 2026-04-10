'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';

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

type Tab = 'profile' | 'integrations' | 'ghl' | 'account';

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
      className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0BAAEF]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border"
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
          : 'bg-[#0BAAEF]/10 border-[#0BAAEF]/30 text-[#0BAAEF] hover:bg-[#0BAAEF]/15'
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
    company_name: 'ExcelMindCyber',
    website: 'https://excelmindcyber.com',
    contact_email: 'admin@excelmindcyber.com',
    timezone: 'America/New_York',
    logo_url: '',
  });
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Admin profile — read from localStorage token + display settings
  const [admin, setAdmin] = useState<AdminProfile>({
    display_name: 'Thelix Holdings',
    email: 'admin@thelixholdings.com',
    role: 'Admin',
  });
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaved, setAdminSaved] = useState(false);

  // GHL fields — read-only display (from env)
  const GHL_FIELDS = [
    { label: 'Urgency Score Field', key: 'GHL_URGENCY_FIELD_ID' },
    { label: 'Income Range Field', key: 'GHL_INCOME_RANGE_FIELD_ID' },
    { label: 'Current Job Field', key: 'GHL_CURRENT_JOB_FIELD_ID' },
    { label: 'Resume S3 Key Field', key: 'GHL_RESUME_S3_KEY_FIELD_ID' },
  ];

  const GHL_WORKFLOWS = [
    { label: 'High Intent Workflow', key: 'GHL_WORKFLOW_HIGH_INTENT', color: 'text-red-400' },
    { label: 'Medium Intent Workflow', key: 'GHL_WORKFLOW_MEDIUM_INTENT', color: 'text-yellow-400' },
    { label: 'Low Intent Workflow', key: 'GHL_WORKFLOW_LOW_INTENT', color: 'text-[#0BAAEF]' },
    { label: 'Default Workflow', key: 'GHL_WORKFLOW_DEFAULT', color: 'text-white/50' },
  ];

  const INTEGRATIONS = [
    { label: 'GoHighLevel CRM', key: 'GHL_API_KEY', description: 'CRM sync for lead capture', icon: '🎯' },
    { label: 'Anthropic (Claude AI)', key: 'ANTHROPIC_API_KEY', description: 'Signal classification + tool AI', icon: '🤖' },
    { label: 'OpenAI (Fallback)', key: 'OPENAI_API_KEY', description: 'AI fallback when Claude unavailable', icon: '⚡' },
    { label: 'Twitter / X', key: 'TWITTER_BEARER_TOKEN', description: 'Signal ingestion from Twitter', icon: '𝕏' },
    { label: 'YouTube Data API', key: 'YOUTUBE_API_KEY', description: 'Signal ingestion from YouTube comments', icon: '▶' },
    { label: 'AWS S3', key: 'AWS_ACCESS_KEY_ID', description: 'Resume file storage', icon: '☁' },
    { label: 'RapidAPI (Reddit)', key: 'RAPIDAPI_KEY', description: 'Enhanced Reddit signal ingestion', icon: '🔴' },
    { label: 'Apify', key: 'APIFY_API_KEY', description: 'Twitter & YouTube scraping fallback', icon: '🕷' },
  ];

  const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Paris',
    'Africa/Lagos', 'Africa/Nairobi', 'Africa/Accra', 'Asia/Dubai', 'UTC',
  ];

  useEffect(() => {
    // Load saved org profile
    const saved = localStorage.getItem('emc_org_profile');
    if (saved) {
      try { setOrg(JSON.parse(saved)); } catch {}
    }
    const savedAdmin = localStorage.getItem('emc_admin_profile');
    if (savedAdmin) {
      try { setAdmin(JSON.parse(savedAdmin)); } catch {}
    }

    // Fetch health and integration status from backend
    adminApi.getHealth().then((r) => setHealth(r.data)).catch(() => {});
    adminApi.getIntegrationStatus().then((r) => setIntegrationStatus(r.data)).catch(() => {});
  }, []);

  const saveOrg = () => {
    setOrgSaving(true);
    localStorage.setItem('emc_org_profile', JSON.stringify(org));
    setTimeout(() => {
      setOrgSaving(false);
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 3000);
    }, 600);
  };

  const saveAdmin = () => {
    setAdminSaving(true);
    localStorage.setItem('emc_admin_profile', JSON.stringify(admin));
    setTimeout(() => {
      setAdminSaving(false);
      setAdminSaved(true);
      setTimeout(() => setAdminSaved(false), 3000);
    }, 600);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'profile', label: 'Organisation', icon: '🏢' },
    { key: 'account', label: 'Admin Account', icon: '👤' },
    { key: 'integrations', label: 'Integrations', icon: '🔌' },
    { key: 'ghl', label: 'GoHighLevel', icon: '🎯' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-white font-bold text-xl">Settings</h1>
        <p className="text-white/30 text-xs mt-0.5">Manage your organisation profile, integrations, and account preferences</p>
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

      {/* ── ORGANISATION PROFILE TAB ── */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <Section title="Organisation Profile" subtitle="Your company details used across the dashboard and reports">
            <Field label="Company Name" hint="Displayed in the admin sidebar">
              <Input
                value={org.company_name}
                onChange={(v) => setOrg({ ...org, company_name: v })}
                placeholder="e.g. ExcelMindCyber"
              />
            </Field>
            <Field label="Website" hint="Public-facing website URL">
              <Input
                value={org.website}
                onChange={(v) => setOrg({ ...org, website: v })}
                placeholder="https://excelmindcyber.com"
                type="url"
              />
            </Field>
            <Field label="Contact Email" hint="Used for admin notifications">
              <Input
                value={org.contact_email}
                onChange={(v) => setOrg({ ...org, contact_email: v })}
                placeholder="admin@excelmindcyber.com"
                type="email"
              />
            </Field>
            <Field label="Timezone" hint="Used for date formatting across the dashboard">
              <select
                value={org.timezone}
                onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0BAAEF]/40 transition-colors border"
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
                placeholder="e.g. Thelix Holdings"
              />
            </Field>
            <Field label="Admin Email" hint="Login email — change via server environment variable ADMIN_EMAIL">
              <Input
                value={admin.email}
                onChange={(v) => setAdmin({ ...admin, email: v })}
                placeholder="admin@thelixholdings.com"
                type="email"
              />
            </Field>
            <Field label="Role" hint="Access level — currently fixed to Admin">
              <div className="flex items-center gap-2">
                <Input value="Admin" disabled />
                <span className="text-xs px-2.5 py-1.5 rounded-lg bg-[#0BAAEF]/10 text-[#0BAAEF] border border-[#0BAAEF]/20 whitespace-nowrap">
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
                  Update <code className="text-[#0BAAEF] bg-[#0BAAEF]/10 px-1 py-0.5 rounded text-[10px]">ADMIN_PASSWORD</code> in your <code className="text-[#0BAAEF] bg-[#0BAAEF]/10 px-1 py-0.5 rounded text-[10px]">.env</code> file and restart the backend to change your password.
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
                  localStorage.removeItem('emc_admin_token');
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
          <Section title="API Integrations" subtitle="All integrations are configured via environment variables on the server">
            <div className="space-y-0">
              {INTEGRATIONS.map((integration) => (
                <div key={integration.key} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-lg shrink-0">
                      {integration.icon}
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">{integration.label}</p>
                      <p className="text-white/30 text-xs">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <code className="text-white/20 text-[10px] font-mono hidden sm:block">{integration.key}</code>
                    {integrationStatus === null ? (
                      <span className="inline-block w-20 h-6 rounded-full bg-white/5 animate-pulse" />
                    ) : (
                      <StatusDot ok={integrationStatus[integration.key] === true} />
                    )}
                  </div>
                </div>
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
            <span className="text-yellow-400 text-lg shrink-0">⚠</span>
            <div>
              <p className="text-yellow-400 text-sm font-medium">Changing API keys requires server restart</p>
              <p className="text-white/40 text-xs mt-1">
                Edit your <code className="text-[#0BAAEF] bg-[#0BAAEF]/10 px-1 py-0.5 rounded text-[10px]">.env</code> file on the server and restart with <code className="text-[#0BAAEF] bg-[#0BAAEF]/10 px-1 py-0.5 rounded text-[10px]">npm run start:dev</code> to apply changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── GOHIGHLEVEL TAB ── */}
      {tab === 'ghl' && (
        <div className="space-y-4">
          <Section title="GoHighLevel Connection" subtitle="CRM integration configuration">
            <Field label="API Version" hint="Using GHL REST API v1 (location JWT)">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1.5 rounded-lg bg-[#0BAAEF]/10 text-[#0BAAEF] border border-[#0BAAEF]/20 font-mono">
                  rest.gohighlevel.com/v1
                </span>
              </div>
            </Field>
            <Field label="Location ID" hint="Your GHL sub-account location ID">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={{ background: 'var(--a-hover)', borderColor: 'var(--a-border2)' }}>
                <code className="text-white/50 text-sm font-mono tracking-wide">GOurOpNFFOsJjzv6wz0h</code>
                <button
                  onClick={() => navigator.clipboard.writeText('GOurOpNFFOsJjzv6wz0h')}
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

          <Section title="Custom Fields" subtitle="GHL custom field IDs mapped from lead data">
            <div className="space-y-0">
              {GHL_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white/70 text-sm">{f.label}</p>
                    <code className="text-white/25 text-[10px] font-mono">{f.key}</code>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-[#0BAAEF] border border-white/8 font-mono">
                    Configured
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Automation Workflows" subtitle="Intent-based GHL workflows triggered on lead creation">
            <div className="space-y-0">
              {GHL_WORKFLOWS.map((w) => (
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

          <Section title="Sync Behaviour" subtitle="How leads are synced to GoHighLevel">
            <div className="space-y-3">
              {[
                { label: 'Sync timing', value: 'Immediate — within 5 seconds of form submission' },
                { label: 'Retry attempts', value: '3 attempts with exponential backoff (2s → 4s → 8s)' },
                { label: 'Queue', value: 'BullMQ ghl-sync queue — monitored at /admin/queues' },
                { label: 'Deduplication', value: 'GHL returns 422 on duplicate email — stored as existing contact' },
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
              <p className="text-white/30 text-xs">View live GHL sync jobs, retries, and failed jobs</p>
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#0BAAEF]/10 border border-[#0BAAEF]/30 text-[#0BAAEF] hover:bg-[#0BAAEF]/15 transition-colors whitespace-nowrap"
            >
              Open Queue Monitor ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
