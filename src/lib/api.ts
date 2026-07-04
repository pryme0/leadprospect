// Local mock data layer for the SaaS demo.
// The app keeps its original API-shaped imports, but every method below now
// resolves from deterministic in-memory data instead of calling a backend.

type MockResponse<T> = Promise<{ data: T }>;

function wait<T>(data: T, ms = 180): MockResponse<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve({ data }), ms);
  });
}

/**
 * Real network call for the persisted Lead engine (backed by /api/leads).
 * Returns the same `{ data }` envelope the mock layer uses so callers are
 * unchanged. Throws an Error carrying the server message on failure.
 */
/** Bearer token from the admin session (browser only). Lets server routes
 * identify the logged-in user so leads can be scoped per user. */
function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('synq_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(input: string, init?: RequestInit): Promise<{ data: T }> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init?.headers || {}) },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const message = json?.message || json?.error || `Request failed (${res.status})`;
    const err: any = new Error(message);
    err.response = { data: json };
    throw err;
  }
  return { data: json as T };
}

function todayMinus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function pageSlice<T>(items: T[], page = 1, limit = 20) {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = Math.max(0, (page - 1) * limit);
  return { data: items.slice(start, start + limit), total, total_pages };
}

function offsetSlice<T>(items: T[], offset = 0, limit = 20) {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  return { data: items.slice(offset, offset + limit), total, total_pages };
}

// ========== Lead engine APIs ==========

export interface LeadCaptureRequest {
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start: string;
  income_goal: string;
  source_tool: string;
  result_id: string;
  consented: boolean;
  lead_source?: string;
}

export interface SignalStats {
  total: number;
  processed: number;
  pending: number;
  withEmail: number;
  automationSent: number;
  automationSentToday: number;
  automationSentYesterday: number;
  automationPending: number;
  byIntentLevel: { intent_level: string | null; count: number }[];
  byIntentCategory: { intent_category: string | null; count: number }[];
  byIngestionCategory: { ingestion_category: string | null; count: number }[];
}

export interface QuickCaptureRequest {
  first_name: string;
  email: string;
  phone_number: string;
  consent_call: boolean;
  consent_email: boolean;
  consented: boolean;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_path?: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

type IntentLevel = 'HIGH_INTENT' | 'MEDIUM_INTENT' | 'LOW_INTENT';
type Platform = 'twitter' | 'reddit' | 'youtube' | 'linkedin' | 'instagram' | 'google' | 'tiktok';

interface MockSignal {
  id: string;
  source: Platform;
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  content: string;
  url: string;
  timestamp: string;
  intent_level: IntentLevel | null;
  intent_category: string | null;
  ingestion_category: string | null;
  pain_points: string[];
  urgency_score: number;
  summary: string;
  processed: boolean;
  content_hash: string;
  created_at: string;
  classified_at: string | null;
  automation_sent_at?: string | null;
  enriched_name?: string | null;
  enriched_email?: string | null;
  enriched_phone?: string | null;
  enriched_company?: string | null;
  enriched_title?: string | null;
  enriched_linkedin_url?: string | null;
  enriched_via?: string | null;
  enriched_at?: string | null;
  ghl_contact_id?: string | null;
}

interface MockOutreachMessage {
  id: string;
  signal_id: string;
  platform: Platform;
  username: string;
  name?: string | null;
  original_content: string;
  original_url: string;
  tool_recommendation: string;
  suggested_reply: string;
  outreach_type: string;
  status: 'pending' | 'approved' | 'sent' | 'skipped' | 'failed';
  auto_approved: boolean;
  send_error: string | null;
  sent_url: string | null;
  intent_level: IntentLevel;
  urgency_score: number;
  intent_category: string;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  is_active: boolean;
  created_at: string;
}

const signals: MockSignal[] = [
  {
    id: 'sig_1001',
    source: 'linkedin',
    username: 'northstar_ops',
    name: 'Maria Okafor',
    email: 'maria@northstarclinics.example',
    phone: '+1 312 555 0198',
    content: 'Clicked a Google Ads demo campaign, visited pricing twice, and submitted the multi-location healthcare operations form.',
    url: 'https://linkedin.com/feed/update/sig_1001',
    timestamp: todayMinus(0),
    intent_level: 'HIGH_INTENT',
    intent_category: 'Budget Active',
    ingestion_category: 'google_ads',
    pain_points: ['Multi-location routing', 'Pricing viewed', 'Needs fast follow-up'],
    urgency_score: 91,
    summary: 'Healthcare operator showing buying intent from paid search and pricing activity.',
    processed: true,
    content_hash: 'hash_1001',
    created_at: todayMinus(0),
    classified_at: todayMinus(0),
    automation_sent_at: null,
    enriched_name: 'Maria Okafor',
    enriched_email: 'maria@northstarclinics.example',
    enriched_phone: '+1 312 555 0198',
    enriched_company: 'Northstar Clinics',
    enriched_title: 'Operations Director',
    enriched_linkedin_url: 'https://linkedin.com/in/maria-okafor',
    enriched_via: 'demo-enrichment',
    enriched_at: todayMinus(0),
    ghl_contact_id: 'ghl_7781',
  },
  {
    id: 'sig_1002',
    source: 'reddit',
    username: 'heliopay_growth',
    name: null,
    email: null,
    phone: null,
    content: 'Imported from Meta lead ads after downloading the revenue attribution checklist and asking about HubSpot routing.',
    url: 'https://reddit.com/r/cybersecurity/comments/sig_1002',
    timestamp: todayMinus(0),
    intent_level: 'HIGH_INTENT',
    intent_category: 'High Fit Account',
    ingestion_category: 'meta_ads',
    pain_points: ['HubSpot routing', 'Revenue attribution', 'Duplicate leads'],
    urgency_score: 86,
    summary: 'Fintech growth team wants cleaner lead routing from Meta campaigns into CRM.',
    processed: true,
    content_hash: 'hash_1002',
    created_at: todayMinus(0),
    classified_at: todayMinus(0),
    automation_sent_at: todayMinus(0),
    ghl_contact_id: null,
  },
  {
    id: 'sig_1003',
    source: 'linkedin',
    username: 'aster_logistics',
    name: 'Samuel Reed',
    email: 'samuel@asterlogistics.example',
    phone: null,
    content: 'Engaged with LinkedIn ads, opened the integrations page, and searched for Salesforce dedupe workflows.',
    url: 'https://linkedin.com/feed/update/sig_1003',
    timestamp: todayMinus(1),
    intent_level: 'MEDIUM_INTENT',
    intent_category: 'Evaluating Vendor',
    ingestion_category: 'linkedin_ads',
    pain_points: ['Salesforce dedupe', 'Agency handoff', 'Attribution clarity'],
    urgency_score: 73,
    summary: 'Logistics team comparing lead intelligence tools for Salesforce-connected campaigns.',
    processed: true,
    content_hash: 'hash_1003',
    created_at: todayMinus(1),
    classified_at: todayMinus(1),
    automation_sent_at: null,
    enriched_name: 'Samuel Reed',
    enriched_email: 'samuel@asterlogistics.example',
    enriched_company: 'Aster Logistics',
    enriched_title: 'Revenue Operations Manager',
    enriched_via: 'demo-enrichment',
    enriched_at: todayMinus(1),
  },
  {
    id: 'sig_1004',
    source: 'tiktok',
    username: 'cedar_home_services',
    name: null,
    email: null,
    phone: null,
    content: 'TikTok lead form requested campaign cleanup help for three service territories and faster sales callbacks.',
    url: 'https://tiktok.com/@cedar_home_services/video/sig_1004',
    timestamp: todayMinus(1),
    intent_level: 'MEDIUM_INTENT',
    intent_category: 'Needs Outreach',
    ingestion_category: 'tiktok_ads',
    pain_points: ['Territory routing', 'Callback speed', 'Lead quality'],
    urgency_score: 62,
    summary: 'Home-services operator needs territory-aware routing from TikTok campaigns.',
    processed: true,
    content_hash: 'hash_1004',
    created_at: todayMinus(1),
    classified_at: todayMinus(1),
    automation_sent_at: null,
    ghl_contact_id: 'ghl_7784',
  },
  {
    id: 'sig_1005',
    source: 'instagram',
    username: 'studio_margin',
    name: 'Ava Mitchell',
    email: null,
    phone: null,
    content: 'Instagram ad lead asking whether SYNQ can suppress existing customers from retargeting campaigns.',
    url: 'https://instagram.com/p/sig_1005',
    timestamp: todayMinus(2),
    intent_level: 'LOW_INTENT',
    intent_category: null,
    ingestion_category: 'instagram_ads',
    pain_points: ['Customer suppression', 'Audience hygiene'],
    urgency_score: 48,
    summary: 'Retail brand lead awaiting qualification for audience suppression and hygiene workflow.',
    processed: false,
    content_hash: 'hash_1005',
    created_at: todayMinus(2),
    classified_at: null,
    automation_sent_at: null,
  },
  {
    id: 'sig_1006',
    source: 'linkedin',
    username: 'daniel_patel',
    name: 'Daniel Patel',
    email: 'daniel.patel@example.com',
    phone: '+1 646 555 0134',
    content: 'CRM import shows expansion intent after multiple product-page visits and a new buying committee contact.',
    url: 'https://linkedin.com/feed/update/sig_1006',
    timestamp: todayMinus(3),
    intent_level: 'HIGH_INTENT',
    intent_category: 'Established Professional',
    ingestion_category: 'crm_import',
    pain_points: ['Expansion signal', 'Buying committee', 'Account routing'],
    urgency_score: 88,
    summary: 'Existing account has fresh expansion activity and needs sales-owner routing.',
    processed: true,
    content_hash: 'hash_1006',
    created_at: todayMinus(3),
    classified_at: todayMinus(3),
    automation_sent_at: todayMinus(1),
    enriched_name: 'Daniel Patel',
    enriched_email: 'daniel.patel@example.com',
    enriched_phone: '+1 646 555 0134',
    enriched_company: 'Beacon Financial',
    enriched_title: 'VP Revenue Operations',
    enriched_linkedin_url: 'https://linkedin.com/in/daniel-patel',
    enriched_via: 'demo-enrichment',
    enriched_at: todayMinus(3),
    ghl_contact_id: 'ghl_7786',
  },
];

// Leads are no longer mocked here — they persist in leads.db and are served by
// the /api/leads route. See leadsApi.quickCapture and adminApi.getLeads below.

let users: MockUser[] = [
  { id: 'usr_1', name: 'SYNQ Admin', email: 'admin@synq.demo', role: 'admin', is_active: true, created_at: todayMinus(42) },
  { id: 'usr_2', name: 'Growth Operator', email: 'growth@synq.demo', role: 'admin', is_active: true, created_at: todayMinus(18) },
  { id: 'usr_3', name: 'Read Only Analyst', email: 'analyst@synq.demo', role: 'viewer', is_active: true, created_at: todayMinus(9) },
];

let outreach: MockOutreachMessage[] = [
  {
    id: 'out_3001',
    signal_id: 'sig_1001',
    platform: 'linkedin',
    username: 'maria_okafor',
    name: 'Maria Okafor',
    original_content: signals[0].content,
    original_url: signals[0].url,
    tool_recommendation: 'source-routing',
    suggested_reply: 'Maria, SYNQ can connect the Google Ads source, clinic-location fit, and pricing-page activity so the right sales owner follows up today.',
    outreach_type: 'dm',
    status: 'pending',
    auto_approved: false,
    send_error: null,
    sent_url: null,
    intent_level: 'HIGH_INTENT',
    urgency_score: 91,
    intent_category: 'Budget Active',
    created_at: todayMinus(0),
    approved_at: null,
    sent_at: null,
  },
  {
    id: 'out_3002',
    signal_id: 'sig_1002',
    platform: 'reddit',
    username: 'auditNewbie22',
    original_content: signals[1].content,
    original_url: signals[1].url,
    tool_recommendation: 'crm-routing',
    suggested_reply: 'Your Meta campaign and HubSpot context can be deduped into one qualified lead queue with source attribution intact.',
    outreach_type: 'reply',
    status: 'approved',
    auto_approved: true,
    send_error: null,
    sent_url: null,
    intent_level: 'HIGH_INTENT',
    urgency_score: 86,
    intent_category: 'High Fit Account',
    created_at: todayMinus(0),
    approved_at: todayMinus(0),
    sent_at: null,
  },
  {
    id: 'out_3003',
    signal_id: 'sig_1003',
    platform: 'linkedin',
    username: 'aster_logistics',
    name: 'Samuel Reed',
    original_content: signals[2].content,
    original_url: signals[2].url,
    tool_recommendation: 'dedupe-preview',
    suggested_reply: 'SYNQ can show how Salesforce dedupe, source scoring, and sales-owner routing work before new campaign leads hit your CRM.',
    outreach_type: 'reply',
    status: 'sent',
    auto_approved: true,
    send_error: null,
    sent_url: 'https://linkedin.com/feed/update/demo',
    intent_level: 'MEDIUM_INTENT',
    urgency_score: 73,
    intent_category: 'Evaluating Vendor',
    created_at: todayMinus(1),
    approved_at: todayMinus(1),
    sent_at: todayMinus(0),
  },
  {
    id: 'out_3004',
    signal_id: 'sig_1006',
    platform: 'linkedin',
    username: 'daniel_patel',
    name: 'Daniel Patel',
    original_content: signals[5].content,
    original_url: signals[5].url,
    tool_recommendation: 'account-expansion',
    suggested_reply: 'Daniel, SYNQ can flag the new buying committee activity and route expansion accounts without mixing them into net-new ad leads.',
    outreach_type: 'dm',
    status: 'failed',
    auto_approved: false,
    send_error: 'LinkedIn connection required before DM',
    sent_url: null,
    intent_level: 'HIGH_INTENT',
    urgency_score: 88,
    intent_category: 'Existing Customer',
    created_at: todayMinus(2),
    approved_at: todayMinus(2),
    sent_at: null,
  },
];

export const leadsApi = {
  // Persists a real lead via the /api/leads route (leads.db).
  quickCapture: (data: QuickCaptureRequest) =>
    apiFetch<{ ok: boolean; id: string }>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

function outreachStats() {
  const sent = outreach.filter((m) => m.status === 'sent');
  const approved = outreach.filter((m) => m.status === 'approved');
  const failed = outreach.filter((m) => m.status === 'failed');
  return {
    sent_today: sent.length,
    approved_today: approved.length,
    pending_total: outreach.filter((m) => m.status === 'pending').length,
    approved_total: approved.length,
    total_sent: sent.length + 241,
    failed_total: failed.length,
    failed_today: failed.length,
    skipped_total: outreach.filter((m) => m.status === 'skipped').length,
    daily_target: 120,
    sent_by_day: Array.from({ length: 7 }, (_, i) => ({ date: todayMinus(6 - i), count: [21, 34, 29, 41, 55, 64, 67][i] })),
    sent_by_platform: [
      { platform: 'linkedin', count: 112 },
      { platform: 'twitter', count: 84 },
      { platform: 'reddit', count: 45 },
    ],
    sent_by_tool: [
      { tool: 'source-routing', count: 117 },
      { tool: 'crm-routing', count: 72 },
      { tool: 'dedupe-preview', count: 52 },
    ],
    approved_by_tool: [
      { tool: 'source-routing', count: outreach.filter((m) => m.tool_recommendation === 'source-routing' && m.status === 'approved').length + 12 },
      { tool: 'crm-routing', count: outreach.filter((m) => m.tool_recommendation === 'crm-routing' && m.status === 'approved').length + 7 },
      { tool: 'dedupe-preview', count: outreach.filter((m) => m.tool_recommendation === 'dedupe-preview' && m.status === 'approved').length + 4 },
    ],
    failed_by_platform: [{ platform: 'linkedin', count: failed.length }],
    top_failure_reasons: [{ reason: 'Connection required before DM', count: failed.length }],
  };
}

export const adminApi = {
  login: (_data: AdminLoginRequest) => wait({ token: 'demo-admin-token' }, 300),

  // Dashboard + signals now read real crawler records from the classifier
  // Postgres (via /api/crawler/*), not mock data.
  getDashboardMetrics: () => apiFetch<any>('/api/crawler/metrics'),

  getSignalStats: () => apiFetch<any>('/api/crawler/stats'),

  // Keyword-refinement engine: pace vs. the 5/day target, top-performing
  // keywords, and recent prune/regenerate activity for the logged-in org.
  getKeywordPerformance: () => apiFetch<any>('/api/crawler/keyword-performance'),

  getSignals: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return apiFetch<any>(`/api/crawler/signals?${qs.toString()}`);
  },

  // The Lead Queue shows the crawler's enriched, deduped, prospect-only leads.
  getLeads: (params: { page?: number; limit?: number; source_tool?: string; intent_level?: string } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    if (params.source_tool) qs.set('source_tool', params.source_tool);
    if (params.intent_level) qs.set('intent_level', params.intent_level);
    return apiFetch<any>(`/api/crawler/leads?${qs.toString()}`);
  },

  triggerIngest: (platform: 'twitter' | 'reddit' | 'youtube' | 'linkedin' | 'instagram' | 'google' | 'tiktok') =>
    wait({ count: platform === 'linkedin' ? 18 : 9, saved: platform === 'linkedin' ? 18 : 9 }, 700),

  classifySignal: (signalId: string) => {
    const target = signals.find((s) => s.id === signalId);
    if (target) {
      target.processed = true;
      target.intent_level = target.intent_level || 'MEDIUM_INTENT';
      target.intent_category = target.intent_category || 'Evaluating Vendor';
      target.summary = target.summary || 'Classified demo signal with medium buying intent.';
      target.classified_at = new Date().toISOString();
    }
    return wait<any>({ data: target || signals[0] });
  },

  classifyBatch: () => {
    let classified = 0;
    signals.forEach((signal) => {
      if (!signal.processed) {
        signal.processed = true;
        signal.intent_level = 'MEDIUM_INTENT';
        signal.intent_category = 'Evaluating Vendor';
        signal.classified_at = new Date().toISOString();
        classified += 1;
      }
    });
    return wait({ classified }, 900);
  },

  getClassifiedSignals: (params: { limit?: number; offset?: number; intent_level?: string; min_urgency?: number } = {}) => {
    const qs = new URLSearchParams();
    qs.set('processed', 'true');
    qs.set('limit', String(params.limit ?? 20));
    qs.set('offset', String(params.offset ?? 0));
    if (params.intent_level) qs.set('intent_level', params.intent_level);
    if (params.min_urgency) qs.set('min_urgency', String(params.min_urgency));
    qs.set('order_by', 'urgency_score');
    return apiFetch<any>(`/api/crawler/signals?${qs.toString()}`);
  },

  getSignalById: (id: string) => apiFetch<any>(`/api/crawler/signals/${encodeURIComponent(id)}`),

  getHealth: () => wait({ ok: true, status: 'ok', version: 'demo-2.0.0', timestamp: new Date().toISOString() }),

  retryGhlSync: () => apiFetch<{ queued: number; synced: number }>('/api/leads/sync', { method: 'POST' }),

  getIntegrationStatus: () => wait({
    GOOGLE_ADS_CUSTOMER_ID: true,
    META_ADS_ACCOUNT_ID: true,
    TIKTOK_ADS_ACCOUNT_ID: true,
    LINKEDIN_ADS_ACCOUNT_ID: true,
    HUBSPOT_PRIVATE_APP_TOKEN: true,
    SALESFORCE_CLIENT_ID: false,
    WEB_FORM_SIGNING_SECRET: true,
    ENRICHMENT_API_KEY: true,
  }),

  // Real, persisted team management (SQLite users table) with plan-based seats.
  getUsers: () => apiFetch<{ users: any[]; seats: { used: number; limit: number; remaining: number; modules: string[] } }>('/api/users'),

  createUser: (data: { name: string; email: string; password: string; role: 'admin' | 'viewer' }) =>
    apiFetch<any>('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: string, data: { name?: string; role?: 'admin' | 'viewer'; is_active?: boolean; password?: string }) =>
    apiFetch<any>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (id: string) => apiFetch<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),

  getOutreachQueue: (params: { page?: number; limit?: number; status?: string; platform?: string; tool_recommendation?: string } = {}) => {
    let rows = [...outreach];
    if (params.status) rows = rows.filter((m) => m.status === params.status);
    if (params.platform) rows = rows.filter((m) => m.platform === params.platform);
    if (params.tool_recommendation) rows = rows.filter((m) => m.tool_recommendation === params.tool_recommendation);
    const result = pageSlice(rows, params.page ?? 1, params.limit ?? 15);
    return wait({ data: result.data, pagination: { total: result.total, total_pages: result.total_pages } });
  },

  getOutreachStats: () => wait(outreachStats()),

  updateOutreach: (id: string, data: { status: 'approved' | 'sent' | 'skipped'; reply?: string }) => {
    outreach = outreach.map((m) => (
      m.id === id
        ? {
            ...m,
            status: data.status,
            suggested_reply: data.reply || m.suggested_reply,
            approved_at: data.status === 'approved' ? new Date().toISOString() : m.approved_at,
            sent_at: data.status === 'sent' ? new Date().toISOString() : m.sent_at,
          }
        : m
    ));
    return wait(outreach.find((m) => m.id === id));
  },

  triggerOutreachGenerate: () => wait({ generated: 3 }, 900),

  triggerOutreachSend: () => {
    outreach = outreach.map((m) => (m.status === 'approved' ? { ...m, status: 'sent', sent_at: new Date().toISOString(), sent_url: m.original_url } : m));
    return wait({ sent: 1 }, 1000);
  },

  retryFailedOutreach: () => {
    outreach = outreach.map((m) => (m.status === 'failed' ? { ...m, status: 'approved', send_error: null } : m));
    return wait({ retried: 1 }, 700);
  },

  bulkApproveOutreach: () => {
    outreach = outreach.map((m) => (m.status === 'pending' ? { ...m, status: 'approved', approved_at: new Date().toISOString() } : m));
    return wait({ approved: 1 }, 700);
  },

  getManualDmRequired: (params: { page?: number; limit?: number; platform?: string } = {}) => {
    let rows = outreach.filter((m) => m.outreach_type === 'dm' && (m.status === 'failed' || m.send_error));
    if (params.platform) rows = rows.filter((m) => m.platform === params.platform);
    const result = pageSlice(rows, params.page ?? 1, params.limit ?? 15);
    return wait({
      data: result.data,
      pagination: { total: result.total, total_pages: result.total_pages },
      by_platform: [{ platform: 'linkedin', count: rows.filter((m) => m.platform === 'linkedin').length }],
    });
  },

  convertDmToReply: (id: string) => {
    outreach = outreach.map((m) => (m.id === id ? { ...m, outreach_type: 'reply', status: 'approved', send_error: null } : m));
    return wait({ ok: true });
  },
};

const api = {
  get: <T>(data: T) => wait(data),
  post: <T>(data: T) => wait(data),
};

export default api;
