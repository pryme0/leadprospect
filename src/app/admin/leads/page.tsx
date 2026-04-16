'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';

interface Lead {
  id: string;
  first_name: string;
  email: string;
  phone_number: string;
  timeline_to_start: string;
  income_goal: string;
  source_tool: string;
  intent_level: string;
  consented: boolean;
  ghl_contact_id: string | null;
  lead_source: string | null;
  created_at: string;
}

// Human-readable label + badge colour for the `lead_source` column.
// Canonical values:
//   'cr' — Agent Crawler (EnrichmentService — crawled signals → enriched leads)
//   'so' — Social Media (manually-tagged social-channel acquisition)
//   null — organic website capture via the tool modals
// Legacy values kept for back-compat:
//   'social' / 'crawler' — pre-cr/so taxonomy
function sourceLabel(s: string | null | undefined): { label: string; cls: string } {
  switch (s) {
    case 'cr':
      return { label: 'Agent Crawler', cls: 'badge-yellow' };
    case 'so':
      return { label: 'Social Media', cls: 'badge-blue' };
    case 'social': // legacy
      return { label: 'Social Media', cls: 'badge-blue' };
    case 'crawler': // legacy
      return { label: 'Agent Crawler', cls: 'badge-yellow' };
    default:
      return { label: 'Website', cls: 'badge-green' };
  }
}

// `source_tool` is the tool this lead would convert with (content-driven).
// Tool form submissions set it to the tool the user filled out. Enrichment-
// sourced leads set it to the tool that best matches the signal's content.
const TOOLS = ['', 'cyber-path-finder', 'career-assessment', 'resume-analyzer'];
const INTENT_LEVELS = ['', 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'];

function toolLabel(tool: string) {
  return tool
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    source_tool: '',
    intent_level: '',
  });
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [syncResult, setSyncResult] = useState<{ queued: number } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filters.source_tool) params.source_tool = filters.source_tool;
      if (filters.intent_level) params.intent_level = filters.intent_level;

      const res = await adminApi.getLeads(params);
      setLeads(res.data.leads || res.data.data || []);
      setTotalPages(
        res.data.total_pages ||
        res.data.totalPages ||
        res.data.pagination?.total_pages ||
        1
      );
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleGhlSync = async () => {
    setSyncState('syncing');
    setSyncResult(null);
    try {
      const res = await adminApi.retryGhlSync();
      setSyncResult(res.data);
      setSyncState('done');
      // Refresh leads after a short delay so ghl_contact_id updates appear
      setTimeout(() => fetchLeads(), 3000);
      setTimeout(() => setSyncState('idle'), 6000);
    } catch {
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 4000);
    }
  };

  const unsyncedCount = leads.filter((l) => !l.ghl_contact_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-brand-muted text-sm">Captured leads from career tools</p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={handleGhlSync}
            disabled={syncState === 'syncing'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border
              ${syncState === 'done'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : syncState === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-[#0BAAEF]/10 border-[#0BAAEF]/30 text-[#0BAAEF] hover:bg-[#0BAAEF]/15'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {syncState === 'syncing' ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Syncing...
              </>
            ) : syncState === 'done' ? (
              <>✓ Queued {syncResult?.queued ?? 0} leads</>
            ) : syncState === 'error' ? (
              <>✗ Sync failed — retry?</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync to GoHighLevel
                {unsyncedCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#0BAAEF]/20 text-[#0BAAEF] text-[10px] font-bold">
                    {unsyncedCount}
                  </span>
                )}
              </>
            )}
          </button>
          {unsyncedCount > 0 && syncState === 'idle' && (
            <p className="text-white/25 text-[10px]">{unsyncedCount} lead{unsyncedCount !== 1 ? 's' : ''} not yet synced on this page</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="select-field w-auto min-w-[180px]"
          value={filters.source_tool}
          onChange={(e) => handleFilterChange('source_tool', e.target.value)}
        >
          <option value="">All Tools</option>
          {TOOLS.filter(Boolean).map((t) => (
            <option key={t} value={t}>{toolLabel(t)}</option>
          ))}
        </select>

        <select
          className="select-field w-auto min-w-[160px]"
          value={filters.intent_level}
          onChange={(e) => handleFilterChange('intent_level', e.target.value)}
        >
          <option value="">All Intent Levels</option>
          {INTENT_LEVELS.filter(Boolean).map((l) => (
            <option key={l} value={l}>{l.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="loading-spinner w-8 h-8 border-[#0BAAEF]" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 text-brand-muted">No leads found.</div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Timeline</th>
                <th>Income Goal</th>
                <th>Tool</th>
                <th>Source</th>
                <th>Intent</th>
                <th>GHL Sync</th>
                <th>Consent</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="font-medium text-white whitespace-nowrap">{lead.first_name}</td>
                  <td className="text-brand-light">{lead.email}</td>
                  <td className="text-brand-muted whitespace-nowrap">{lead.phone_number}</td>
                  <td className="text-brand-muted text-xs">{lead.timeline_to_start || '-'}</td>
                  <td className="text-brand-muted text-xs">{lead.income_goal || '-'}</td>
                  <td>
                    <span className="badge-blue">{toolLabel(lead.source_tool)}</span>
                  </td>
                  <td>
                    {(() => {
                      const { label, cls } = sourceLabel(lead.lead_source);
                      return <span className={cls}>{label}</span>;
                    })()}
                  </td>
                  <td>
                    <span
                      className={
                        lead.intent_level === 'HIGH_INTENT'
                          ? 'badge-red'
                          : lead.intent_level === 'MEDIUM_INTENT'
                          ? 'badge-yellow'
                          : 'badge-green'
                      }
                    >
                      {(lead.intent_level || 'N/A').replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {lead.ghl_contact_id ? (
                      <span className="badge-green" title={lead.ghl_contact_id}>
                        ✓ Synced
                      </span>
                    ) : (
                      <span className="badge-yellow">Pending</span>
                    )}
                  </td>
                  <td>
                    {lead.consented ? (
                      <span className="badge-green">Yes</span>
                    ) : (
                      <span className="badge-red">No</span>
                    )}
                  </td>
                  <td className="text-brand-muted text-xs whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-brand-muted text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-brand-slate rounded-lg text-sm text-brand-light hover:bg-brand-slate/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-brand-slate rounded-lg text-sm text-brand-light hover:bg-brand-slate/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
