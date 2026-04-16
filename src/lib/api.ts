import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token for all admin/protected routes
const PROTECTED_PREFIXES = ['/api/admin', '/api/dashboard', '/api/leads', '/ingest', '/classify'];

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('emc_admin_token');
    if (token && PROTECTED_PREFIXES.some((p) => config.url?.startsWith(p))) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      if (isAdminRoute && !window.location.pathname.includes('/admin/login')) {
        localStorage.removeItem('emc_admin_token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// ========== Tool APIs ==========

export interface CyberPathFinderRequest {
  current_job: string;
  country: string;
  income_goal: string;
}

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

export interface CareerAssessmentRequest {
  answers: { question_id: string; answer: string }[];
}

export const toolsApi = {
  // Cyber Path Finder
  submitCyberPathFinder: (data: CyberPathFinderRequest) =>
    api.post('/api/tools/cyber-path-finder', data),

  unlockCyberPathFinder: (data: LeadCaptureRequest) =>
    api.post('/api/tools/cyber-path-finder/unlock', data),

  // Career Assessment
  submitCareerAssessment: (data: CareerAssessmentRequest) =>
    api.post('/api/tools/career-assessment', data),

  unlockCareerAssessment: (data: LeadCaptureRequest) =>
    api.post('/api/tools/career-assessment/unlock', data),

  // Resume Analyzer
  submitResumeAnalysis: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/api/tools/resume-analyzer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  unlockResumeAnalysis: (data: LeadCaptureRequest) =>
    api.post('/api/tools/resume-analyzer/unlock', data),
};

// ========== Admin APIs ==========

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export const adminApi = {
  login: (data: AdminLoginRequest) =>
    api.post('/api/admin/login', data),

  getDashboardMetrics: () =>
    api.get('/api/dashboard/metrics'),

  getSignals: (params: {
    page?: number;
    limit?: number;
    source?: string;
    intent_level?: string;
    processed?: string;
  }) =>
    api.get('/api/admin/signals', { params }),

  getLeads: (params: {
    page?: number;
    limit?: number;
    source_tool?: string;
    intent_level?: string;
  }) =>
    api.get('/api/admin/leads', { params }),

  // ── Pipeline controls (US-01 to US-07) ──────────────────────────

  // Manually trigger ingestion per platform
  triggerIngest: (platform: 'twitter' | 'reddit' | 'youtube' | 'linkedin' | 'instagram') =>
    api.post(`/ingest/${platform}`),

  // Classify a single signal by ID
  classifySignal: (signalId: string) =>
    api.post(`/classify/${signalId}`),

  // Run batch classification on all unprocessed signals
  classifyBatch: () =>
    api.post('/classify/batch'),

  // Get classified signals with optional filters
  getClassifiedSignals: (params: {
    limit?: number;
    offset?: number;
    intent_level?: string;
    min_urgency?: number;
  }) =>
    api.get('/signals/classified', { params }),

  // Get a single signal by ID — auth-protected admin route
  getSignalById: (id: string) =>
    api.get(`/api/admin/signals/${id}`),

  // Health check (pipeline status indicator)
  getHealth: () =>
    api.get('/health'),

  // Trigger GHL sync for all leads without a ghl_contact_id
  retryGhlSync: () =>
    api.post('/api/leads/ghl-sync'),

  // Integration status — which env vars are configured on the server
  getIntegrationStatus: () =>
    api.get('/api/admin/integration-status'),

  // ── User management (admin only) ────────────────────────────────
  getUsers: () =>
    api.get('/api/admin/users'),

  createUser: (data: { name: string; email: string; password: string; role: 'admin' | 'viewer' }) =>
    api.post('/api/admin/users', data),

  updateUser: (id: string, data: { name?: string; role?: 'admin' | 'viewer'; is_active?: boolean; password?: string }) =>
    api.patch(`/api/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/api/admin/users/${id}`),

  // ── Outreach (admin only) ───────────────────────────────────────
  getOutreachQueue: (params: {
    page?: number;
    limit?: number;
    status?: string;
    platform?: string;
    tool_recommendation?: string;
  }) =>
    api.get('/api/admin/outreach', { params }),

  getOutreachStats: () =>
    api.get('/api/admin/outreach/stats'),

  updateOutreach: (id: string, data: { status: 'approved' | 'sent' | 'skipped'; reply?: string }) =>
    api.patch(`/api/admin/outreach/${id}`, data),

  triggerOutreachGenerate: () =>
    api.post('/api/admin/outreach/generate'),

  triggerOutreachSend: () =>
    api.post('/api/admin/outreach/send-now'),

  retryFailedOutreach: () =>
    api.post('/api/admin/outreach/retry-failed'),

  bulkApproveOutreach: () =>
    api.post('/api/admin/outreach/bulk-approve'),

  getManualDmRequired: (params: {
    page?: number;
    limit?: number;
    platform?: string;
  }) => api.get('/api/admin/outreach/manual-dm-required', { params }),

  // Convert a DM-disabled lead to a public reply so the next batch attempts
  // a comment instead of another DM. Marks the row approved + outreach_type=reply.
  convertDmToReply: (id: string) =>
    api.patch(`/api/admin/outreach/${id}`, { status: 'approved' }),
};

export default api;
