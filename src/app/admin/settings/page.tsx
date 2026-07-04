'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { INTEGRATIONS } from '@/lib/integrations';
import { getSubscription } from '@/lib/subscription-store';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgProfile {
  company_name: string;
  website: string;
  contact_email: string;
  timezone: string;
  logo_url: string;
  industry: string;
  about: string;
  services: string;
  expectations: string;
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

/**
 * Reads an image file and returns a data URI, downscaled so the longer side
 * is at most `maxDim` px. Keeps the stored logo small — it round-trips through
 * a TEXT column and localStorage, and a full-resolution phone photo would
 * otherwise bloat both. SVGs pass through untouched (already small, vector).
 */
async function fileToLogoDataUrl(file: File, maxDim = 512): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image is too large (max 5MB).');

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

  if (file.type === 'image/svg+xml') return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read the image.'));
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
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

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-xl px-4 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-[#00CEC8]/40 transition-colors border placeholder:text-white/20"
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
    company_name: 'SYNQ',
    website: 'https://synq.demo',
    contact_email: 'admin@synq.demo',
    timezone: 'America/New_York',
    logo_url: '',
    industry: '',
    about: '',
    services: '',
    expectations: '',
  });
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Mention monitoring (Pulse) — brand terms tracked across the web.
  const [brand, setBrand] = useState({ brand_keywords: '', brand_handles: '', exclude_terms: '' });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandAnalyzing, setBrandAnalyzing] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [mentionsAnalyzedAt, setMentionsAnalyzedAt] = useState<string | null>(null);

  // Lead Intelligence — website analysis + lead generation
  interface LeadAnalysis { summary: string; target_audience: string; pain_points: string[]; keywords: string[]; }
  const [leadSubscribed, setLeadSubscribed] = useState<boolean | null>(null);
  const [leadAnalysis, setLeadAnalysis] = useState<LeadAnalysis | null>(null);
  const [leadAnalyzedAt, setLeadAnalyzedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<string | null>(null);

  // Admin profile — read from localStorage token + display settings
  const [admin, setAdmin] = useState<AdminProfile>({
    display_name: 'SYNQ Operator',
    email: 'admin@synq.demo',
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
    // Load saved org profile — localStorage first (instant), server authoritative.
    const saved = localStorage.getItem('synq_org_profile');
    if (saved) {
      try { setOrg((prev) => ({ ...prev, ...JSON.parse(saved) })); } catch {}
    }

    // Load real user from auth token — override any stale localStorage profile
    const token = localStorage.getItem('synq_admin_token');
    if (token) {
      const authHeaders = { Authorization: `Bearer ${token}` };

      fetch('/api/auth/me', { headers: authHeaders })
        .then((r) => r.ok ? r.json() : null)
        .then((u) => {
          if (u) {
            setAdmin({ display_name: u.name, email: u.email, role: u.role === 'admin' ? 'Admin' : 'Viewer' });
          }
        })
        .catch(() => {});

      // Server-side org profile (authoritative — the crawler reads from here).
      fetch('/api/settings/org', { headers: authHeaders })
        .then((r) => r.ok ? r.json() : null)
        .then((res) => {
          if (res?.profile) {
            setOrg((prev) => ({ ...prev, ...res.profile }));
            setBrand({
              brand_keywords: (res.profile.brand_keywords ?? []).join('\n'),
              brand_handles: (res.profile.brand_handles ?? []).join('\n'),
              exclude_terms: (res.profile.exclude_terms ?? []).join('\n'),
            });
            setMentionsAnalyzedAt(res.profile.mentions_analyzed_at ?? null);
          }
        })
        .catch(() => {});

      // Lead Intelligence subscription + last analysis status.
      fetch('/api/leads/generate', { headers: authHeaders })
        .then((r) => r.ok ? r.json() : null)
        .then((res) => {
          if (!res) return;
          let subscribed = !!res.subscribed;
          // Self-heal: if the server gate is behind the client subscription
          // (e.g. subscribed but never mirrored), reflect it and sync the server.
          if (!subscribed) {
            const clientMods = getSubscription()?.modules ?? [];
            if (clientMods.includes('leads')) {
              subscribed = true;
              fetch('/api/subscription/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ modules: clientMods }),
              }).catch(() => {});
            }
          }
          setLeadSubscribed(subscribed);
          setLeadAnalysis(res.analysis ?? null);
          setLeadAnalyzedAt(res.analyzed_at ?? null);
        })
        .catch(() => {});
    } else {
      const savedAdmin = localStorage.getItem('synq_admin_profile');
      if (savedAdmin) { try { setAdmin(JSON.parse(savedAdmin)); } catch {} }
    }

    // Fetch health and integration status from backend
    adminApi.getHealth().then((r) => setHealth(r.data)).catch(() => {});
    adminApi.getIntegrationStatus().then((r) => setIntegrationStatus(r.data)).catch(() => {});
  }, []);

  const saveOrg = async () => {
    setOrgSaving(true);
    // Mirror to localStorage for instant reload; persist to the server so the
    // crawler and lead-generation flow can read the company profile.
    localStorage.setItem('synq_org_profile', JSON.stringify(org));
    const token = localStorage.getItem('synq_admin_token');
    try {
      if (token) {
        await fetch('/api/settings/org', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(org),
        });
      }
    } catch { /* keep localStorage copy on network failure */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('synq:org-changed'));
    setOrgSaving(false);
    setOrgSaved(true);
    setTimeout(() => setOrgSaved(false), 3000);
  };

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    setLogoUploading(true);
    try {
      // Basic client-side guardrails before hitting the network.
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Image is too large (max 5MB).');

      // Upload to Cloudinary via our server route (returns a hosted URL).
      const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'synq/logos');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.url) { setOrg((prev) => ({ ...prev, logo_url: data.url })); return; }
      }
      // Not configured (503) or failed → fall back to an inline data URI so the
      // logo still works before Cloudinary keys are added.
      const data = await res.json().catch(() => null);
      if (res.status !== 503) {
        throw new Error(data?.message || 'Upload failed. Please try again.');
      }
      const dataUrl = await fileToLogoDataUrl(file);
      setOrg((prev) => ({ ...prev, logo_url: dataUrl }));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Could not upload that image.');
    } finally {
      setLogoUploading(false);
    }
  };

  const parseList = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

  const saveBrand = async () => {
    setBrandSaving(true);
    setBrandError(null);
    const token = localStorage.getItem('synq_admin_token');
    try {
      if (token) {
        await fetch('/api/settings/org', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            brand_keywords: parseList(brand.brand_keywords),
            brand_handles: parseList(brand.brand_handles),
            exclude_terms: parseList(brand.exclude_terms),
          }),
        });
      }
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2500);
    } catch { setBrandError('Could not save. Try again.'); }
    finally { setBrandSaving(false); }
  };

  const analyzeBrandTerms = async () => {
    setBrandAnalyzing(true);
    setBrandError(null);
    const token = localStorage.getItem('synq_admin_token');
    try {
      // Persist profile edits first so analysis uses current company details.
      if (token) {
        await fetch('/api/settings/org', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(org),
        });
      }
      const res = await fetch('/api/settings/brand/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!res.ok) { setBrandError(data.message || 'Analysis failed.'); return; }
      if (data.brand) {
        setBrand({
          brand_keywords: (data.brand.brand_keywords ?? []).join('\n'),
          brand_handles: (data.brand.brand_handles ?? []).join('\n'),
          exclude_terms: (data.brand.exclude_terms ?? []).join('\n'),
        });
      }
      if (data.profile?.mentions_analyzed_at) setMentionsAnalyzedAt(data.profile.mentions_analyzed_at);
    } catch { setBrandError('Analysis failed. Try again.'); }
    finally { setBrandAnalyzing(false); }
  };

  const generateLeads = async () => {
    setGenerating(true);
    setGenError(null);
    setGenStatus(null);
    const token = localStorage.getItem('synq_admin_token');
    try {
      // Persist the latest profile first so the server analyzes current values.
      if (token) {
        await fetch('/api/settings/org', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(org),
        });
      }
      const res = await fetch('/api/leads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ start_crawl: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data?.message || 'Lead generation failed.');
        return;
      }
      setLeadAnalysis(data.analysis ?? null);
      setLeadAnalyzedAt(new Date().toISOString());
      const p = data.provisioning || {};
      setGenStatus(
        p.crawler_connected
          ? `Crawler updated — ${p.keywords_added} keywords, ${p.crawls_started} crawls started. Leads will appear in the Lead Queue as they're found.`
          : `Analysis saved and ${data.analysis?.keywords?.length ?? 0} keywords staged. Connect the crawler (CRAWLER_API_URL) to start collecting leads.`,
      );
    } catch (err) {
      setGenError('Network error — please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const saveAdmin = async () => {
    setAdminSaving(true);
    // The display name IS the organization name — persist it to the DB (org
    // profile) so it survives reloads and shows in the sidebar everywhere.
    localStorage.setItem('synq_org_profile', JSON.stringify(org));
    localStorage.setItem('synq_admin_profile', JSON.stringify(admin));
    const token = localStorage.getItem('synq_admin_token');
    try {
      if (token) {
        await fetch('/api/settings/org', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ company_name: org.company_name }),
        });
      }
    } catch { /* keep localStorage copy on network failure */ }
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('synq:org-changed'));
    setAdminSaving(false);
    setAdminSaved(true);
    setTimeout(() => setAdminSaved(false), 3000);
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
                placeholder="e.g. SYNQ"
              />
            </Field>
            <Field label="Website" hint="Public-facing website URL">
              <Input
                value={org.website}
                onChange={(v) => setOrg({ ...org, website: v })}
                placeholder="https://synq.demo"
                type="url"
              />
            </Field>
            <Field label="Contact Email" hint="Used for admin notifications">
              <Input
                value={org.contact_email}
                onChange={(v) => setOrg({ ...org, contact_email: v })}
                placeholder="admin@synq.demo"
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
            <Field label="Logo" hint="Used as your workspace icon across the dashboard. PNG, JPG or SVG.">
              <div className="flex items-center gap-4">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt="Logo preview"
                    className="h-20 w-20 shrink-0 rounded-xl border object-contain p-1.5"
                    style={{ borderColor: 'var(--a-border2)', background: 'var(--a-input-bg)' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed text-[11px]"
                    style={{ borderColor: 'var(--a-border2)', color: 'var(--a-text-40)' }}
                  >
                    No logo
                  </div>
                )}
                <div>
                  <label
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium cursor-pointer border transition-colors hover:border-[#00CEC8]/40"
                    style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
                  >
                    {logoUploading ? 'Processing…' : org.logo_url ? 'Replace logo' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={(e) => { handleLogoFile(e.target.files?.[0]); e.target.value = ''; }}
                    />
                  </label>
                  {org.logo_url && (
                    <button
                      type="button"
                      onClick={() => setOrg((prev) => ({ ...prev, logo_url: '' }))}
                      className="ml-2 text-xs transition-colors"
                      style={{ color: 'var(--a-text-40)' }}
                    >
                      Remove
                    </button>
                  )}
                  {logoError && <p className="mt-1.5 text-xs text-red-400">{logoError}</p>}
                </div>
              </div>
            </Field>
          </Section>

          <Section
            title="Company Context"
            subtitle="Tell SYNQ what your business does. This context personalises lead scoring, AI reply drafts, and routing to your goals."
          >
            <Field label="Industry" hint="e.g. B2B SaaS, Fintech, Real Estate, Agency">
              <Input
                value={org.industry}
                onChange={(v) => setOrg({ ...org, industry: v })}
                placeholder="e.g. B2B SaaS"
              />
            </Field>
            <Field label="About your company" hint="A short description of who you are">
              <Textarea
                value={org.about}
                onChange={(v) => setOrg({ ...org, about: v })}
                placeholder="e.g. We help mid-market revenue teams unify ad, CRM, and social signals into one scored pipeline."
                rows={3}
              />
            </Field>
            <Field label="What you do / products & services" hint="What you sell and to whom — used to qualify and route leads">
              <Textarea
                value={org.services}
                onChange={(v) => setOrg({ ...org, services: v })}
                placeholder="e.g. Lead intelligence platform + managed onboarding. Ideal customers: Series A–C B2B teams running paid + outbound."
                rows={3}
              />
            </Field>
            <Field label="Goals & expectations" hint="What a great outcome looks like — SYNQ optimises scoring and replies toward this">
              <Textarea
                value={org.expectations}
                onChange={(v) => setOrg({ ...org, expectations: v })}
                placeholder="e.g. Prioritise high-intent enterprise accounts, keep first response under 2 minutes, and route demo requests straight to senior AEs."
                rows={3}
              />
            </Field>
          </Section>

          <div className="flex justify-end">
            <SaveButton onClick={saveOrg} saving={orgSaving} saved={orgSaved} />
          </div>

          <Section
            title="Mention monitoring (Pulse)"
            subtitle="Track what people say about your company across X, Reddit, YouTube, news and the web. These terms drive the Mentions feed in Pulse."
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-white/30 text-xs">
                Auto-generate terms from your website, then fine-tune. One term per line.
                {mentionsAnalyzedAt && <span className="block mt-0.5">Last generated: {new Date(mentionsAnalyzedAt).toLocaleString()}</span>}
              </p>
              <button
                onClick={analyzeBrandTerms}
                disabled={brandAnalyzing}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-[#6D5EF9]/10 border border-[#6D5EF9]/30 text-[#8B7EF9] hover:bg-[#6D5EF9]/15 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                {brandAnalyzing
                  ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Generating…</>
                  : <>✨ Auto-generate from website</>}
              </button>
            </div>
            {brandError && <p className="text-xs text-red-400">{brandError}</p>}
            <Field label="Brand keywords" hint="Company & product names people mention — one per line">
              <Textarea value={brand.brand_keywords} onChange={(v) => setBrand({ ...brand, brand_keywords: v })} placeholder={'Acme\nAcme CRM\nAcme Analytics'} rows={4} />
            </Field>
            <Field label="Handles" hint="Social usernames for your brand — one per line">
              <Textarea value={brand.brand_handles} onChange={(v) => setBrand({ ...brand, brand_handles: v })} placeholder={'@acme\nacmehq'} rows={2} />
            </Field>
            <Field label="Exclude terms" hint="Filter out false positives if your name is a common word — one per line (optional)">
              <Textarea value={brand.exclude_terms} onChange={(v) => setBrand({ ...brand, exclude_terms: v })} placeholder={'wile e coyote\nlooney tunes'} rows={2} />
            </Field>
            <div className="flex justify-end">
              <SaveButton onClick={saveBrand} saving={brandSaving} saved={brandSaved} />
            </div>
          </Section>

          <Section
            title="Lead Intelligence"
            subtitle="Analyse your website to learn what you do and who your buyers are, then generate matching leads."
          >
            {leadSubscribed === false ? (
              <div className="flex items-start gap-4 p-4 rounded-xl border" style={{ background: 'var(--a-hover)', borderColor: 'var(--a-border)' }}>
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0 text-yellow-400 text-sm">🔒</div>
                <div>
                  <p className="text-white/70 text-sm font-medium">Lead Intelligence is not active on your account</p>
                  <p className="text-white/30 text-xs mt-1">
                    Subscribe to the Lead Intelligence module to analyse your website and generate leads.{' '}
                    <Link href="/admin/subscription" className="text-[#00CEC8] hover:underline">View plans →</Link>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Analyse website &amp; generate leads</p>
                    <p className="text-white/30 text-xs mt-1">
                      Uses your Website, About and What&nbsp;you&nbsp;do fields above. Save any edits first.
                      {leadAnalyzedAt && (
                        <span className="block mt-0.5">Last run: {new Date(leadAnalyzedAt).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={generateLeads}
                    disabled={generating || leadSubscribed === null}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-[#00CEC8]/10 border border-[#00CEC8]/30 text-[#00CEC8] hover:bg-[#00CEC8]/15 disabled:opacity-50 transition-all whitespace-nowrap"
                  >
                    {generating ? (
                      <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Analysing…</>
                    ) : (
                      <>✨ Analyse &amp; generate</>
                    )}
                  </button>
                </div>

                {genError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-red-300 text-xs">{genError}</div>
                )}
                {genStatus && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-300 text-xs">
                    {genStatus} <Link href="/admin/leads" className="underline">Open Lead Queue →</Link>
                  </div>
                )}

                {leadAnalysis && (
                  <div className="space-y-3 rounded-xl border p-4" style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-[0.18em]">What you do</p>
                      <p className="text-white/70 text-sm mt-1">{leadAnalysis.summary}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-[0.18em]">Target audience</p>
                      <p className="text-white/70 text-sm mt-1">{leadAnalysis.target_audience}</p>
                    </div>
                    {leadAnalysis.keywords?.length > 0 && (
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-[0.18em]">Search signals ({leadAnalysis.keywords.length})</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {leadAnalysis.keywords.map((k) => (
                            <span key={k} className="text-[11px] px-2 py-1 rounded-lg bg-white/5 text-white/60 border border-white/8">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ── ADMIN ACCOUNT TAB ── */}
      {tab === 'account' && (
        <div className="space-y-4">
          <Section title="Admin Account" subtitle="Your personal admin profile and display settings">
            <Field label="Display Name" hint="Your organization name — shown in the sidebar and reports">
              <Input
                value={org.company_name}
                onChange={(v) => setOrg({ ...org, company_name: v })}
                placeholder="e.g. Kofa Africa"
              />
            </Field>
            <Field label="Admin Email" hint="Login email — change via server environment variable ADMIN_EMAIL">
              <Input
                value={admin.email}
                onChange={(v) => setAdmin({ ...admin, email: v })}
                placeholder="admin@synq.demo"
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
                  localStorage.removeItem('synq_admin_token');
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
                  SYNQ Routing API v1
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
