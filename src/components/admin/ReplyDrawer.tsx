'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, Sparkles, Send, Copy } from 'lucide-react';
import { channelLabel } from '@/lib/labels';

export interface ReplyLead {
  id: string;
  platform: string | null;
  username?: string | null;
  name?: string | null;
  postContent?: string | null;
  /** Direct link to the exact comment/post that triggered the lead. */
  referenceUrl?: string | null;
}

function token(): string {
  return typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') || '' : '';
}

/**
 * One-click "reply to this lead": drafts an AI opener that references what they
 * said, then opens a direct message with them on their platform (copying the
 * draft so it's a paste-and-send). Shared by the Leads and Buyer-activity pages.
 * All the real work keys off the signal id server-side (/api/outreach/*).
 */
export function ReplyDrawer({ lead, onClose, onSent }: {
  lead: ReplyLead;
  onClose: () => void;
  onSent?: (leadId: string) => void;
}) {
  const platformLabel = channelLabel(lead.platform);
  const [text, setText] = useState('');
  const [drafting, setDrafting] = useState(true);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [locked, setLocked] = useState(false); // comms add-on required

  const draft = async () => {
    setDrafting(true);
    setNote(null);
    try {
      const r = await fetch('/api/outreach/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const d = await r.json();
      if (r.status === 403) { setLocked(true); return; }
      if (r.ok && d.draft) setText(d.draft);
    } catch { /* leave textarea empty */ }
    finally { setDrafting(false); }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await draft(); })();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { cancelled = true; window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    setNote(null);
    try {
      const r = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ leadId: lead.id, text: text.trim() }),
      });
      const d = await r.json();
      if (r.status === 403) { setLocked(true); setSending(false); return; }
      if (!r.ok) { setNote(d.message || 'Couldn’t send. Try again.'); setSending(false); return; }
      if (d.assisted) {
        try { await navigator.clipboard.writeText(text.trim()); } catch { /* ignore */ }
        const opened = d.dmUrl || d.url;
        if (opened) window.open(opened, '_blank', 'noopener');
        setNote(d.isTrueDm
          ? `Message copied — opened your chat on ${platformLabel}. Paste and send.`
          : `Message copied — opened ${platformLabel}. Tap Message, paste and send.`);
      } else {
        setNote(`Sent on ${platformLabel}.`);
      }
      onSent?.(lead.id);
      setTimeout(onClose, d.assisted ? 1800 : 1000);
    } catch {
      setNote('Network error.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(8,12,24,0.55)' }} />
      <div
        className="relative z-10 flex h-full w-full max-w-md flex-col"
        style={{ background: 'var(--a-bg)', borderLeft: '1px solid var(--a-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--a-border)' }}>
          <div>
            <p className="text-[15px] font-bold" style={{ color: 'var(--a-text)' }}>
              {lead.name || (lead.username ? `@${lead.username}` : 'Reply to lead')}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--a-text-50)' }}>
              {platformLabel}{lead.username ? ` · @${lead.username}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg cursor-pointer hover:bg-[var(--a-hover2)]" style={{ color: 'var(--a-text-50)' }}>
            <X size={18} />
          </button>
        </div>

        {locked ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--a-text)' }}>Replying needs the Messages add-on</p>
            <p className="text-[13px]" style={{ color: 'var(--a-text-50)' }}>Add Messages to reach leads directly with an AI-written opener.</p>
            <a href="/admin/subscription" className="mt-2 rounded-xl px-4 h-10 inline-flex items-center font-semibold text-white" style={{ background: 'var(--t-accent, #6D5EF9)' }}>Get Messages</a>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {lead.postContent && (
                <div className="rounded-xl p-3.5 text-[13px] leading-relaxed" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)', color: 'var(--a-text-80)' }}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--a-text-40)' }}>What they said</p>
                    {lead.referenceUrl && (
                      <a href={lead.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline" style={{ color: 'var(--t-accent, #6D5EF9)' }}>
                        Open original <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {String(lead.postContent).slice(0, 400)}
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--a-text-40)' }}>
                    Your message {drafting && '· writing…'}
                  </p>
                  <button onClick={draft} disabled={drafting}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50 hover:underline" style={{ color: 'var(--t-accent, #6D5EF9)' }}>
                    <Sparkles size={12} /> Rewrite
                  </button>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  placeholder={drafting ? 'Writing an opener…' : 'Write your message…'}
                  className="w-full resize-none rounded-xl p-3.5 text-[14px] outline-none"
                  style={{ background: 'var(--a-card)', border: '1px solid var(--a-border2)', color: 'var(--a-text)' }}
                />
              </div>
              {note && <p className="text-[13px]" style={{ color: 'var(--a-text-60)' }}>{note}</p>}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex items-center gap-2" style={{ borderColor: 'var(--a-border)' }}>
              <button onClick={handleSend} disabled={sending || drafting || !text.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl h-11 font-semibold text-white disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--t-accent, #6D5EF9)' }}>
                <Send size={16} /> {sending ? 'Opening…' : 'Reply now'}
              </button>
              <button
                onClick={async () => { try { await navigator.clipboard.writeText(text.trim()); setNote('Copied.'); } catch { /* ignore */ } }}
                disabled={!text.trim()}
                title="Copy message"
                className="grid h-11 w-11 place-items-center rounded-xl disabled:opacity-40 cursor-pointer"
                style={{ background: 'var(--a-card)', border: '1px solid var(--a-border2)', color: 'var(--a-text-60)' }}>
                <Copy size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
