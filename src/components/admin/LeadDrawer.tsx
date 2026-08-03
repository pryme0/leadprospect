'use client';

import { useState, useEffect, useCallback } from 'react';

interface Lead {
  id: string;
  first_name: string;
  email: string;
  phone_number: string;
  username?: string | null;
  source?: string;
  intent_level?: string;
  pipeline_stage?: string | null;
  profile_url?: string | null;
  summary?: string | null;
}

interface Note {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Activity {
  id: string;
  action: string;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

interface Props {
  lead: Lead | null;
  onClose: () => void;
  token: () => string;
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
};

export default function LeadDrawer({ lead, onClose, token }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    if (!lead) return;
    const headers = { Authorization: `Bearer ${token()}` };
    const [notesRes, tagsRes, allTagsRes, activityRes, usersRes, assignRes] = await Promise.all([
      fetch(`/api/leads/${lead.id}/notes`, { headers }).then((r) => r.json()),
      fetch(`/api/leads/${lead.id}/tags`, { headers }).then((r) => r.json()).catch(() => ({ tags: [] })),
      fetch('/api/leads/tags', { headers }).then((r) => r.json()),
      fetch(`/api/pipeline/activity?leadId=${lead.id}`, { headers }).then((r) => r.json()),
      fetch('/api/users', { headers }).then((r) => r.json()).catch(() => ({ users: [] })),
      fetch(`/api/leads/assign?leadIds=${lead.id}`, { headers }).then((r) => r.json()).catch(() => ({ assignments: {} })),
    ]);
    setNotes(notesRes.notes ?? []);
    setTags(tagsRes.tags ?? []);
    setAllTags(allTagsRes.tags ?? []);
    setActivity(activityRes.activity ?? []);
    setTeamMembers((usersRes.users ?? []).filter((u: TeamMember) => u.is_active !== false));
    setAssignedUserId(assignRes.assignments?.[lead.id]?.user_id ?? '');
  }, [lead, token]);

  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!lead || !newNote.trim()) return;
    setSaving(true);
    await fetch(`/api/leads/${lead.id}/notes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNote }),
    });
    setNewNote('');
    setSaving(false);
    load();
  };

  const createAndAssignTag = async () => {
    if (!lead || !newTag.trim()) return;
    setSaving(true);
    const res = await fetch('/api/leads/tags', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: newTag }),
    });
    const { tag } = await res.json();
    if (tag) {
      await fetch('/api/leads/tags', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', leadId: lead.id, tagId: tag.id }),
      });
    }
    setNewTag('');
    setSaving(false);
    load();
  };

  const setAssignee = async (userId: string) => {
    if (!lead) return;
    setAssigning(true);
    setAssignedUserId(userId);
    try {
      if (!userId) {
        await fetch('/api/leads/assign', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id, action: 'unassign' }),
        });
      } else {
        await fetch('/api/leads/assign', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id, userId }),
        });
      }
    } finally {
      setAssigning(false);
    }
  };

  const toggleTag = async (tag: Tag) => {
    if (!lead) return;
    const isAssigned = tags.some((t) => t.id === tag.id);
    await fetch('/api/leads/tags', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: isAssigned ? 'unassign' : 'assign', leadId: lead.id, tagId: tag.id }),
    });
    load();
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative h-full w-full max-w-md overflow-y-auto border-l"
        style={{ background: 'var(--a-bg)', borderColor: 'var(--a-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4" style={{ background: 'var(--a-bg)', borderColor: 'var(--a-border)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>{lead.first_name || lead.username || 'Lead'}</h2>
            <p className="text-xs" style={{ color: 'var(--a-text-50)' }}>{lead.email || lead.username}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--a-text-60)' }}>close</span>
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Info */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--a-text-40)' }}>Info</h3>
            <div className="space-y-1.5 text-sm" style={{ color: 'var(--a-text)' }}>
              {lead.email && <p><span style={{ color: 'var(--a-text-50)' }}>Email:</span> {lead.email}</p>}
              {lead.phone_number && <p><span style={{ color: 'var(--a-text-50)' }}>Phone:</span> {lead.phone_number}</p>}
              {lead.source && <p><span style={{ color: 'var(--a-text-50)' }}>Platform:</span> {lead.source}</p>}
              {lead.intent_level && <p><span style={{ color: 'var(--a-text-50)' }}>Intent:</span> {lead.intent_level.replace('_INTENT', '')}</p>}
              {lead.pipeline_stage && <p><span style={{ color: 'var(--a-text-50)' }}>Stage:</span> {STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage}</p>}
              {lead.profile_url && (
                <p>
                  <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#6D5EF9' }}>
                    View profile →
                  </a>
                </p>
              )}
            </div>
            {lead.summary && (
              <p className="mt-2 rounded-lg border p-3 text-xs" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)', color: 'var(--a-text-70)' }}>
                {lead.summary}
              </p>
            )}
          </section>

          {/* Assigned to */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--a-text-40)' }}>Assigned to</h3>
            <select
              value={assignedUserId}
              disabled={assigning}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
              style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name || m.email}</option>
              ))}
            </select>
          </section>

          {/* Tags */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--a-text-40)' }}>Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ background: tag.color + '20', color: tag.color }}
                  onClick={() => toggleTag(tag)}
                  title="Click to remove"
                >
                  {tag.name} ×
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <select
                className="flex-1 rounded-lg border px-2 py-1.5 text-xs"
                style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
                value=""
                onChange={(e) => {
                  const tag = allTags.find((t) => t.id === e.target.value);
                  if (tag) toggleTag(tag);
                }}
              >
                <option value="">Add existing tag...</option>
                {allTags.filter((t) => !tags.some((x) => x.id === t.id)).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag name..."
                className="flex-1 rounded-lg border px-2 py-1.5 text-xs"
                style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
                onKeyDown={(e) => e.key === 'Enter' && createAndAssignTag()}
              />
              <button
                onClick={createAndAssignTag}
                disabled={saving || !newTag.trim()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ background: '#6D5EF9', color: '#fff' }}
              >
                Create
              </button>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--a-text-40)' }}>Notes</h3>
            <div className="flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--a-input-bg)', borderColor: 'var(--a-border2)', color: 'var(--a-text)' }}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <button
                onClick={addNote}
                disabled={saving || !newNote.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: '#6D5EF9', color: '#fff' }}
              >
                Add
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {notes.length === 0 && <p className="text-xs" style={{ color: 'var(--a-text-40)' }}>No notes yet.</p>}
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg border p-3" style={{ background: 'var(--a-card)', borderColor: 'var(--a-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--a-text)' }}>{note.content}</p>
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--a-text-40)' }}>
                    {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Activity */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--a-text-40)' }}>Activity</h3>
            <div className="space-y-2">
              {activity.length === 0 && <p className="text-xs" style={{ color: 'var(--a-text-40)' }}>No activity yet.</p>}
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ background: '#6D5EF9' }} />
                  <div>
                    <p style={{ color: 'var(--a-text)' }}>
                      Moved to <strong>{STAGE_LABELS[a.to_stage ?? ''] ?? a.to_stage}</strong>
                      {a.from_stage && <span style={{ color: 'var(--a-text-50)' }}> from {STAGE_LABELS[a.from_stage] ?? a.from_stage}</span>}
                    </p>
                    <p style={{ color: 'var(--a-text-40)' }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
