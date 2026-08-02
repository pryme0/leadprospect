'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspaceTheme } from '@/lib/workspace-theme';

interface Assignment {
  id: string;
  lead_id: string;
  lead_name: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  lead_count: number;
}

export default function TeamPage() {
  const theme = useWorkspaceTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMember, setNewMember] = useState({ name: '', email: '' });
  const [adding, setAdding] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const load = () => {
    if (!token) return;
    Promise.all([
      fetch('/api/leads/assign', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/leads/assign/members', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([assignRes, membersRes]) => {
        setAssignments(assignRes.assignments ?? []);
        setMembers(membersRes.members ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addMember = async () => {
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    setAdding(true);
    try {
      await fetch('/api/leads/assign/members', {
        method: 'POST',
        headers,
        body: JSON.stringify(newMember),
      });
      setNewMember({ name: '', email: '' });
      load();
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await fetch(`/api/leads/assign/members/${id}`, { method: 'DELETE', headers });
    load();
  };

  const unassign = async (assignmentId: string) => {
    await fetch(`/api/leads/assign/${assignmentId}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/settings" className="text-xs text-white/40 hover:text-white/60">← Settings</Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Team Assignments</h1>
        <p className="mt-1 text-sm text-white/50">Assign leads to team members</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--t-fg-08)', borderTopColor: theme.accent }} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Team members */}
          <div className="rounded-xl" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--a-border)' }}>
              <h2 className="font-semibold text-white">Team Members</h2>
            </div>
            <div className="p-5 space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'var(--t-fg-03)' }}>
                  <div>
                    <p className="font-medium text-white">{m.name}</p>
                    <p className="text-xs text-white/40">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50">{m.lead_count} leads</span>
                    <button onClick={() => removeMember(m.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                </div>
              ))}
              {members.length === 0 && <p className="text-sm text-white/40 text-center py-4">No team members yet</p>}

              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--a-border)' }}>
                <p className="text-xs font-medium text-white/50 mb-2">Add team member</p>
                <div className="flex gap-2">
                  <input
                    value={newMember.name}
                    onChange={(e) => setNewMember((n) => ({ ...n, name: e.target.value }))}
                    placeholder="Name"
                    className="flex-1 rounded-lg border px-3 py-2 text-sm text-white outline-none"
                    style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  />
                  <input
                    value={newMember.email}
                    onChange={(e) => setNewMember((n) => ({ ...n, email: e.target.value }))}
                    placeholder="Email"
                    className="flex-1 rounded-lg border px-3 py-2 text-sm text-white outline-none"
                    style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}
                  />
                  <button
                    onClick={addMember}
                    disabled={adding}
                    className="rounded-lg px-4 py-2 text-sm font-semibold"
                    style={{ background: theme.accent, color: '#fff' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent assignments */}
          <div className="rounded-xl" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--a-border)' }}>
              <h2 className="font-semibold text-white">Recent Assignments</h2>
            </div>
            <div className="p-5 space-y-2 max-h-96 overflow-y-auto">
              {assignments.slice(0, 20).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg px-4 py-2.5" style={{ background: 'var(--t-fg-03)' }}>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{a.lead_name}</p>
                    <p className="text-xs text-white/40">→ {a.assigned_to}</p>
                  </div>
                  <button onClick={() => unassign(a.id)} className="text-xs text-white/30 hover:text-white/60">×</button>
                </div>
              ))}
              {assignments.length === 0 && <p className="text-sm text-white/40 text-center py-4">No assignments yet</p>}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl p-5" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
        <p className="text-sm text-white/60">
          To assign leads, select them on the Leads page and use the bulk actions, or open a lead's drawer and assign from there.
        </p>
      </div>
    </div>
  );
}
