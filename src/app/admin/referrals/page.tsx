'use client';

import { useCallback, useEffect, useState } from 'react';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Catalog { id: string; label: string; cost: number; leadsPerDay: number; days: number }
interface RefEvent { id: string; type: 'earn' | 'redeem'; points: number; note: string | null; created_at: string }
interface ActiveBonus { perDay: number; until: string }
interface ReferralData {
  code: string | null;
  link: string | null;
  pointsBalance: number;
  pointsEarnedTotal: number;
  referredCount: number;
  activeBonus: ActiveBonus | null;
  catalog: Catalog[];
  events: RefEvent[];
}

const VIOLET = '#6D5EF9';
const TEAL = '#00CEC8';
const MINT = '#21F2A6';

function authHeaders(json = false): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('synq_admin_token') : null;
  const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/referrals', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res) setData(res); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyLink = async () => {
    if (!data?.link) return;
    try { await navigator.clipboard.writeText(data.link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard blocked — user can select manually */ }
  };

  const redeem = async (optionId: string) => {
    setError(null); setNotice(null); setRedeeming(optionId);
    try {
      const res = await fetch('/api/referrals/redeem', {
        method: 'POST', headers: authHeaders(true), body: JSON.stringify({ optionId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body?.message || 'Redemption failed.'); return; }
      setNotice('Reward applied — your extra leads are live. It may take a moment to show up under Leads.');
      window.dispatchEvent(new Event('synq:subscription-changed'));
      load();
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setRedeeming(null);
    }
  };

  const card = { background: 'var(--a-card)', borderColor: 'var(--a-border)' };

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: VIOLET }}>Grow together</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Refer &amp; earn more leads</h1>
        <p className="mt-1 text-sm text-white/45 max-w-2xl">
          Share your link with other businesses. When a company you refer joins SYNQ, you earn points — redeem them for
          <span className="text-white/70"> bonus high-intent leads per day</span>.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border px-6 py-16 text-center text-sm text-white/40" style={card}>Loading…</div>
      ) : !data ? (
        <div className="rounded-2xl border px-6 py-16 text-center text-sm text-white/40" style={card}>Couldn&apos;t load your referrals. Refresh to try again.</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Points balance', value: data.pointsBalance, color: TEAL },
              { label: 'Total earned', value: data.pointsEarnedTotal, color: '#fff' },
              { label: 'Orgs referred', value: data.referredCount, color: VIOLET },
              { label: 'Active bonus', value: data.activeBonus ? `+${data.activeBonus.perDay}/day` : '—', color: MINT },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border p-4" style={card}>
                <p className="text-[11px] uppercase tracking-wider text-white/35">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
                {s.label === 'Active bonus' && data.activeBonus && (
                  <p className="mt-0.5 text-[11px] text-white/35">until {fmtDate(data.activeBonus.until)}</p>
                )}
              </div>
            ))}
          </div>

          {/* Referral link */}
          <div className="rounded-2xl border overflow-hidden" style={card}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--a-border)' }}>
              <h3 className="text-white font-semibold text-sm">Your referral link</h3>
              <p className="text-white/30 text-xs mt-0.5">Anyone who signs up through this link is credited to you when their organization is created.</p>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={data.link ?? 'Set NEXT_PUBLIC_SITE_URL to generate a full link'}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: 'var(--a-input-bg)', border: '1px solid var(--a-border2)', color: 'var(--a-text)' }}
                />
                <button
                  onClick={copyLink}
                  disabled={!data.link}
                  className="rounded-xl px-5 py-2.5 text-sm font-medium transition-all border disabled:opacity-50"
                  style={{ background: `${TEAL}1a`, borderColor: `${TEAL}4d`, color: TEAL }}
                >
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>
              {data.code && (
                <p className="mt-2 text-[12px] text-white/35">Referral code: <span className="font-mono text-white/60">{data.code}</span></p>
              )}
            </div>
          </div>

          {/* Redeem */}
          <div className="rounded-2xl border overflow-hidden" style={card}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--a-border)' }}>
              <h3 className="text-white font-semibold text-sm">Redeem points for leads</h3>
              <p className="text-white/30 text-xs mt-0.5">Each reward tops up your daily high-intent lead cap for its duration. Redeeming replaces any active bonus.</p>
            </div>
            <div className="p-6">
              {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
              {notice && <p className="mb-3 text-xs text-emerald-400">{notice}</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                {data.catalog.map((opt) => {
                  const affordable = data.pointsBalance >= opt.cost;
                  return (
                    <div key={opt.id} className="rounded-xl border p-4 flex flex-col" style={{ background: 'var(--a-card2)', borderColor: 'var(--a-border)' }}>
                      <p className="text-lg font-semibold text-white">+{opt.leadsPerDay}<span className="text-sm font-normal text-white/50">/day</span></p>
                      <p className="text-[12px] text-white/45">for {opt.days} days</p>
                      <p className="mt-3 text-[13px]" style={{ color: TEAL }}>{opt.cost} points</p>
                      <button
                        onClick={() => redeem(opt.id)}
                        disabled={!affordable || redeeming !== null}
                        className="mt-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all border disabled:opacity-40"
                        style={{ background: `${VIOLET}1a`, borderColor: `${VIOLET}4d`, color: VIOLET }}
                      >
                        {redeeming === opt.id ? 'Redeeming…' : affordable ? 'Redeem' : `Need ${opt.cost - data.pointsBalance} more`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* History */}
          <div className="rounded-2xl border overflow-hidden" style={card}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--a-border)' }}>
              <h3 className="text-white font-semibold text-sm">History</h3>
            </div>
            {data.events.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-white/35">No activity yet. Share your link to start earning.</div>
            ) : (
              <div>
                {data.events.map((e, i) => (
                  <div key={e.id} className="flex items-center justify-between gap-4 px-6 py-3.5" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-white/80">{e.note || (e.type === 'earn' ? 'Referral bonus' : 'Redeemed reward')}</p>
                      <p className="text-[11px] text-white/35">{fmtDate(e.created_at)}</p>
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: e.type === 'earn' ? MINT : '#FF7A7A' }}>
                      {e.type === 'earn' ? '+' : '−'}{e.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
