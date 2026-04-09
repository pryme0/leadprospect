'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

interface Signal {
  id: string;
  source: string;
  username: string;
  content: string;
  intent_level: string;
  urgency_score: number;
  pain_points: string[];
  summary: string;
  processed: boolean;
  created_at: string;
}

const INTENT_LEVELS = ['', 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT'];
const SOURCES = ['', 'twitter', 'reddit', 'youtube', 'google'];

function IntentBadge({ level }: { level: string | null }) {
  if (!level) return <span className="badge-blue">Unclassified</span>;
  const cls =
    level === 'HIGH_INTENT'
      ? 'badge-red'
      : level === 'MEDIUM_INTENT'
      ? 'badge-yellow'
      : 'badge-blue';
  return <span className={cls}>{level.replace(/_/g, ' ')}</span>;
}

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    source: '',
    intent_level: '',
    processed: '',
  });

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { offset: (page - 1) * 20, limit: 20 };
      if (filters.source) params.source = filters.source;
      if (filters.intent_level) params.intent_level = filters.intent_level;
      if (filters.processed) params.processed = filters.processed;

      const res = await adminApi.getSignals(params);
      setSignals(res.data.signals || res.data.data || []);
      setTotalPages(
        res.data.total_pages ||
        res.data.totalPages ||
        Math.ceil((res.data.total || 0) / 20) ||
        1
      );
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const filteredSignals = useMemo(() => {
    if (!search.trim()) return signals;
    const q = search.toLowerCase();
    return signals.filter(
      (s) =>
        s.content?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.summary?.toLowerCase().includes(q) ||
        (s.pain_points || []).some((p) => p.toLowerCase().includes(q)),
    );
  }, [signals, search]);

  const PAGE_SIZE = 20;
  const searchTotalPages = Math.max(1, Math.ceil(filteredSignals.length / PAGE_SIZE));
  const pagedFilteredSignals = useMemo(() => {
    if (!search.trim()) return filteredSignals;
    const start = (page - 1) * PAGE_SIZE;
    return filteredSignals.slice(start, start + PAGE_SIZE);
  }, [filteredSignals, search, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Signals</h1>
        <p className="text-brand-muted text-sm">Collected intent signals from social platforms</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search content, username, pain points..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="input-field min-w-[260px] flex-1"
        />

        <select
          className="select-field w-auto min-w-[140px]"
          value={filters.source}
          onChange={(e) => handleFilterChange('source', e.target.value)}
        >
          <option value="">All Sources</option>
          {SOURCES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <select
          className="select-field w-auto min-w-[160px]"
          value={filters.intent_level}
          onChange={(e) => handleFilterChange('intent_level', e.target.value)}
        >
          <option value="">All Intent Levels</option>
          {INTENT_LEVELS.filter(Boolean).map((l) => (
            <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          className="select-field w-auto min-w-[140px]"
          value={filters.processed}
          onChange={(e) => handleFilterChange('processed', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="true">Processed</option>
          <option value="false">Unprocessed</option>
        </select>

        {search && (
          <button
            onClick={() => handleSearchChange('')}
            className="px-3 py-2 text-sm text-brand-muted hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {search && (
        <p className="text-brand-muted text-sm">
          {filteredSignals.length} result{filteredSignals.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="loading-spinner w-8 h-8 border-brand-accent" />
        </div>
      ) : pagedFilteredSignals.length === 0 ? (
        <div className="text-center py-20 text-brand-muted">
          {search ? `No signals match "${search}".` : 'No signals found.'}
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Author</th>
                <th>Content</th>
                <th>Intent</th>
                <th>Urgency</th>
                <th>Pain Points</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {pagedFilteredSignals.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/admin/signals/${s.id}`)}
                  className="cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <td className="capitalize font-medium text-white">{s.source}</td>
                  <td className="text-brand-light">{s.username || '-'}</td>
                  <td className="max-w-xs truncate text-brand-muted" title={s.content}>
                    {s.content?.slice(0, 80)}{s.content?.length > 80 ? '...' : ''}
                  </td>
                  <td><IntentBadge level={s.intent_level} /></td>
                  <td>
                    <span className={`font-mono font-bold ${
                      s.urgency_score >= 7 ? 'text-brand-danger' :
                      s.urgency_score >= 4 ? 'text-yellow-400' : 'text-brand-accent'
                    }`}>
                      {s.urgency_score ?? '-'}
                    </span>
                  </td>
                  <td className="text-brand-muted text-xs">
                    {(s.pain_points || []).slice(0, 2).join(', ')}
                  </td>
                  <td>
                    <span className={s.processed ? 'badge-green' : 'badge-yellow'}>
                      {s.processed ? 'Processed' : 'Pending'}
                    </span>
                  </td>
                  <td className="text-brand-muted text-xs whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {(() => {
        const activeTotalPages = search ? searchTotalPages : totalPages;
        if (activeTotalPages <= 1) return null;
        return (
          <div className="flex items-center justify-between">
            <p className="text-brand-muted text-sm">
              Page {page} of {activeTotalPages}
              {search && ` · ${filteredSignals.length} result${filteredSignals.length !== 1 ? 's' : ''}`}
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
                onClick={() => setPage(Math.min(activeTotalPages, page + 1))}
                disabled={page === activeTotalPages}
                className="px-4 py-2 bg-brand-slate rounded-lg text-sm text-brand-light hover:bg-brand-slate/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
