'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface DuplicateGroup {
  email?: string;
  username?: string;
  leads: {
    id: string;
    first_name: string;
    email: string;
    source_tool: string;
    pipeline_stage: string | null;
    created_at: string;
  }[];
}

export default function DuplicatesPage() {
  const theme = useWorkspaceTheme();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('synq_admin_token');
    if (!token) return;
    fetch('/api/leads/duplicates', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mergeDuplicates = async (group: DuplicateGroup) => {
    const token = localStorage.getItem('synq_admin_token');
    if (!token || group.leads.length < 2) return;
    const primaryId = group.leads[0].id;
    const duplicateIds = group.leads.slice(1).map((l) => l.id);
    setMerging(primaryId);
    try {
      const res = await fetch('/api/leads/merge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId, duplicateIds }),
      });
      if (res.ok) {
        setGroups((prev) => prev.filter((g) => g.leads[0].id !== primaryId));
      }
    } finally {
      setMerging(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/admin/leads" className="text-xs text-white/40 hover:text-white/60">
            ← Back to Leads
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">Duplicate Leads</h1>
          <p className="mt-1 text-sm text-white/50">
            {groups.length} group{groups.length !== 1 ? 's' : ''} of potential duplicates
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }}
          />
        </div>
      ) : groups.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
        >
          <p className="text-lg font-medium text-white/80">No duplicates found</p>
          <p className="mt-2 text-sm text-white/40">All your leads appear to be unique</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, gi) => (
            <div
              key={gi}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}
            >
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ background: 'var(--t-fg-03)', borderBottom: '1px solid var(--a-border)' }}
              >
                <div>
                  <span className="text-sm font-medium text-white">
                    {group.email || `@${group.username}`}
                  </span>
                  <span className="ml-2 text-xs text-white/40">
                    {group.leads.length} duplicates
                  </span>
                </div>
                <button
                  onClick={() => mergeDuplicates(group)}
                  disabled={merging === group.leads[0].id}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                  style={{ background: theme.accent, color: '#fff' }}
                >
                  {merging === group.leads[0].id ? 'Merging...' : 'Merge All'}
                </button>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {group.leads.map((lead, li) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between px-5 py-3"
                    style={{ background: li === 0 ? 'rgba(99,102,241,0.05)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      {li === 0 && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: theme.accent + '20', color: theme.accent }}
                        >
                          Primary
                        </span>
                      )}
                      <span className="text-sm font-medium text-white">{lead.first_name || 'Unnamed'}</span>
                      <span className="text-xs text-white/40">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span>{lead.source_tool}</span>
                      <span>{lead.pipeline_stage || 'No stage'}</span>
                      <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
