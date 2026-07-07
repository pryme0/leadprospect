'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getSubscription,
  saveSubscription,
  type Billing,
} from '@/lib/subscription-store';
import {
  PLAN_TIERS,
  TIER_DEFS,
  TIER_PRICING,
  TIER_LIMITS,
  TIER_MODULES,
  fmtUSD,
  type PlanTier,
  type ModuleId,
} from '@/lib/subscription/tiers';

/* ── Constants ───────────────────────────────────────────────────────────────── */

// Basic = ₦25,000/mo, converted at the real mid-market rate on 2026-07-03
// (₦1,371.80 = $1) and rounded — see TIER_PRICING. Kept env-overridable in case
// the rate needs a manual bump later without a redeploy of the price copy.
const NGN_RATE = Number(process.env.NEXT_PUBLIC_NGN_RATE) || 1372;

const ALL_MODULES: ModuleId[] = ['leads', 'comms', 'email', 'routing'];
const MODULE_LABEL: Record<ModuleId, string> = {
  leads: 'Lead Intelligence',
  comms: 'Pulse',
  email: 'Email Desk',
  routing: 'Routing Desk',
};

type Currency = 'USD' | 'NGN';

function formatPrice(tier: PlanTier, billing: Billing, currency: Currency): string {
  const usd = TIER_PRICING[tier].usd;
  const monthly = billing === 'annual' ? Math.round(usd * 0.8) : usd;
  if (currency === 'USD') return `$${fmtUSD(monthly)}`;
  const ngn = billing === 'annual' ? Math.round(TIER_PRICING[tier].ngn * 0.8) : TIER_PRICING[tier].ngn;
  return `₦${ngn.toLocaleString()}`;
}

function usdMonthly(tier: PlanTier, billing: Billing): number {
  const usd = TIER_PRICING[tier].usd;
  return billing === 'annual' ? Math.round(usd * 0.8) : usd;
}

function ngnMonthly(tier: PlanTier, billing: Billing): number {
  const ngn = TIER_PRICING[tier].ngn;
  return billing === 'annual' ? Math.round(ngn * 0.8) : ngn;
}

const limitLabel = (n: number | null, unit: string) => (n === null ? `Unlimited ${unit}` : `${n} ${unit}`);

/* ── Page ────────────────────────────────────────────────────────────────────── */

export default function SubscriptionPage() {
  const [currentTier,   setCurrentTier]   = useState<PlanTier | null>(null);
  const [selectedTier,  setSelectedTier]  = useState<PlanTier>('basic');
  const [billing,       setBilling]       = useState<Billing>('monthly');
  const [currency,      setCurrency]      = useState<Currency>('USD');
  const [paying,        setPaying]        = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const [payEmail,      setPayEmail]      = useState('');
  const paystackLoaded = useRef(false);

  /* Load stored subscription + user email */
  useEffect(() => {
    // Fast paint from the local cache…
    const sub = getSubscription();
    if (sub?.planTier) {
      setCurrentTier(sub.planTier);
      setSelectedTier(sub.planTier);
      setBilling(sub.billing);
    }
    // …then reconcile with the SHARED server (Postgres), the source of truth.
    const token = localStorage.getItem('synq_admin_token');
    if (token) {
      fetch('/api/subscription/sync', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { planTier?: PlanTier | null } | null) => {
          if (data?.planTier) {
            setCurrentTier(data.planTier);
            setSelectedTier(data.planTier);
          }
        })
        .catch(() => {});
    }
    try {
      // Check all key variants — new names + old names (pre-rename) + signup profile
      const sources = [
        'synq_admin_user', 'synq_admin_profile',
        'prospectgrid_admin_user', 'prospectgrid_admin_profile',
      ];
      for (const key of sources) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { email?: string };
          if (parsed.email) { setPayEmail(parsed.email); break; }
        }
      }
    } catch {}
  }, []);

  /* Load Paystack script */
  useEffect(() => {
    if (paystackLoaded.current) return;
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => { paystackLoaded.current = true; };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const usdTotal = usdMonthly(selectedTier, billing);
  const ngnTotal = ngnMonthly(selectedTier, billing);
  const isChangingPlan = selectedTier !== currentTier;

  const handlePaystack = async () => {
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      alert('Paystack is not yet configured. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local.');
      return;
    }

    if (!payEmail || !payEmail.includes('@')) {
      alert('Please enter a valid email address in the payment field below.');
      return;
    }

    setPaying(true);
    const amountInSmallestUnit = currency === 'NGN'
      ? ngnTotal * 100       // kobo
      : usdTotal * 100;      // cents

    try {
      const initRes = await fetch('/api/subscription/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    payEmail,
          amount:   amountInSmallestUnit,
          currency,
          planTier: selectedTier,
          billing,
        }),
      });

      const initData = await initRes.json() as { reference?: string; error?: string };
      if (!initRes.ok || !initData.reference) {
        alert(`Payment error: ${initData.error ?? 'Unknown error'}`);
        setPaying(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        alert('Payment system not loaded. Please refresh and try again.');
        setPaying(false);
        return;
      }

      const handler = PaystackPop.setup({
        key:      publicKey,
        email:    payEmail,
        amount:   amountInSmallestUnit,
        currency,
        ref:      initData.reference,
        onClose:  () => setPaying(false),
        callback: async (response: { reference: string }) => {
          const verifyRes = await fetch('/api/subscription/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ reference: response.reference }),
          });
          const verifyData = await verifyRes.json() as { verified: boolean; planTier?: string; modules?: string[]; billing?: string };
          if (verifyData.verified && verifyData.planTier) {
            const planTier = verifyData.planTier as PlanTier;
            const modules  = (verifyData.modules ?? TIER_MODULES[planTier]) as ModuleId[];
            const b        = (verifyData.billing ?? billing) as Billing;
            saveSubscription({ modules, planTier, billing: b, activatedAt: new Date().toISOString(), paystackRef: response.reference });
            setCurrentTier(planTier);
            setSelectedTier(planTier);
            setBilling(b);
            setJustActivated(true);
            setTimeout(() => setJustActivated(false), 4000);
          } else {
            alert('Payment verification failed. Contact support if amount was deducted.');
          }
          setPaying(false);
        },
      });
      handler.openIframe();
    } catch {
      alert('Something went wrong. Please try again.');
      setPaying(false);
    }
  };

  const hasSubscription = currentTier !== null;
  const missingModules = ALL_MODULES.filter((m) => !TIER_MODULES[selectedTier].includes(m));

  return (
    <div className="space-y-6">

      {/* ── Controls row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/20">Manage Plan</p>
          <p className="text-[18px] font-bold text-white">Subscription</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Billing toggle */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            {(['monthly', 'annual'] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  billing === b ? 'bg-[#6D5EF9] text-white' : 'text-white/35 hover:text-white/60'
                }`}
              >
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${billing === 'annual' ? 'bg-white/20 text-white' : 'bg-[#10B981]/15 text-[#10B981]'}`}>
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Currency toggle */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            {(['USD', 'NGN'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  currency === c ? 'bg-[#6D5EF9] text-white' : 'text-white/35 hover:text-white/60'
                }`}
              >
                {c === 'USD' ? '$ USD' : '₦ NGN'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── NGN rate note ── */}
      {currency === 'NGN' && (
        <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-amber-400">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          <span className="text-[12px] text-amber-300/80">Approximate rate: 1 USD = ₦{NGN_RATE.toLocaleString()}. Final amount charged may vary with Paystack's live FX rate.</span>
        </div>
      )}

      {/* ── Status banner ── */}
      {justActivated ? (
        <div className="flex items-center gap-3 rounded-xl px-5 py-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10B981]/15">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[#10B981]">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
          </span>
          <div>
            <p className="text-[14px] font-bold text-[#10B981]">Subscription activated!</p>
            <p className="text-[12px] text-white/50">Your workspace is now on the {TIER_DEFS[currentTier!].name} plan.</p>
          </div>
        </div>
      ) : hasSubscription ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl px-5 py-4" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10B981]/15">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white">Active — {TIER_DEFS[currentTier!].name}</p>
            <p className="text-[11px] text-white/35">{billing === 'annual' ? 'Billed annually · 20% savings applied' : 'Billed monthly'}</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold text-white">{formatPrice(currentTier!, billing, currency)}<span className="text-[11px] text-white/30">/mo</span></p>
            <p className="text-[10px] text-white/30">current plan</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-red-400">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          </span>
          <div>
            <p className="text-[13px] font-semibold text-red-300">No active subscription</p>
            <p className="text-[11px] text-white/35">Pick a plan below to unlock your workspace.</p>
          </div>
        </div>
      )}

      {/* ── Main grid: tier cards + summary ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">

        {/* LEFT: tier cards, single-select */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
            {hasSubscription ? 'Choose your plan — switching charges the new plan\'s full price' : 'Choose your plan to get started'}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLAN_TIERS.map((tier) => {
              const def = TIER_DEFS[tier];
              const limits = TIER_LIMITS[tier];
              const isCurrent = currentTier === tier;
              const isSelected = selectedTier === tier;

              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className="relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200"
                  style={{
                    background: isSelected ? `${def.color}08` : 'rgba(255,255,255,0.02)',
                    border: isSelected ? `1px solid ${def.color}50` : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isSelected ? `0 0 0 1px ${def.color}20` : 'none',
                  }}
                >
                  {isCurrent && (
                    <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl" style={{ background: def.color }} />
                  )}

                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-bold text-white">{def.name}</p>
                        {isCurrent && (
                          <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: def.color + '18', color: def.color }}>
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/35">{def.tagline}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[17px] font-bold text-white">{formatPrice(tier, billing, currency)}</p>
                      <p className="text-[10px] text-white/25">/ mo</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {def.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5">
                        <svg viewBox="0 0 8 8" className="h-2 w-2 shrink-0" style={{ color: isSelected ? def.color : 'rgba(255,255,255,0.2)' }}>
                          <path d="M7 1L3 7 1 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                        <span className={`text-[10.5px] ${isSelected ? 'text-white/65' : 'text-white/30'}`}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[10px] text-white/20">
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
                      style={{ borderColor: isSelected ? def.color : 'rgba(255,255,255,0.2)', background: isSelected ? def.color : 'transparent' }}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 20 20" fill="white" className="h-2 w-2">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.09l6.79-6.8a1 1 0 011.42 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    {limitLabel(limits.seats, 'seats')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: sticky summary */}
        <div className="xl:sticky xl:top-6 xl:self-start space-y-3">

          {/* Plan summary card */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">Plan Summary</p>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: TIER_DEFS[selectedTier].color + '25', color: TIER_DEFS[selectedTier].color }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.09l6.79-6.8a1 1 0 011.42 0z" clipRule="evenodd" /></svg>
                </div>
                <span className="flex-1 text-[13px] font-semibold text-white/85">{TIER_DEFS[selectedTier].name}</span>
                <span className="text-[13px] font-semibold text-white/70">{formatPrice(selectedTier, billing, currency)}/mo</span>
              </div>
              {ALL_MODULES.filter((m) => TIER_MODULES[selectedTier].includes(m)).map((m) => (
                <div key={m} className="flex items-center gap-2.5 pl-1">
                  <span className="h-1 w-1 rounded-full bg-white/25" />
                  <span className="flex-1 text-[11px] text-white/45">{MODULE_LABEL[m]}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">Included</span>
                </div>
              ))}
              {missingModules.length > 0 && (
                <div className="pl-1 pt-1 space-y-1">
                  {missingModules.map((m) => (
                    <div key={m} className="flex items-center gap-2.5">
                      <span className="h-1 w-1 rounded-full bg-white/10" />
                      <span className="flex-1 text-[11px] text-white/20 line-through">{MODULE_LABEL[m]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--a-border)' }} />

            {billing === 'annual' && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#10B981]">Annual discount (20%)</span>
                <span className="font-semibold text-[#10B981]">
                  {currency === 'USD'
                    ? `−$${fmtUSD(TIER_PRICING[selectedTier].usd - usdTotal)}/mo`
                    : `−₦${(TIER_PRICING[selectedTier].ngn - ngnTotal).toLocaleString()}/mo`}
                </span>
              </div>
            )}

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-white/25">Total / month</p>
                {billing === 'annual' && (
                  <p className="text-[10px] text-white/20">
                    {currency === 'USD' ? `$${fmtUSD(usdTotal * 12)}/yr billed` : `₦${(ngnTotal * 12).toLocaleString()}/yr billed`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[26px] font-bold text-white">{currency === 'USD' ? `$${fmtUSD(usdTotal)}` : `₦${ngnTotal.toLocaleString()}`}</span>
                <span className="text-[11px] text-white/30">/mo</span>
              </div>
            </div>

            {/* Email for payment */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
                Payment email
              </label>
              <input
                type="email"
                value={payEmail}
                onChange={(e) => setPayEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border bg-white/[0.05] px-3 py-2 text-[13px] text-white outline-none transition-all placeholder:text-white/20"
                style={{ borderColor: payEmail && payEmail.includes('@') ? 'rgba(109,94,249,0.5)' : 'rgba(255,255,255,0.1)' }}
              />
              {payEmail && !payEmail.includes('@') && (
                <p className="mt-1 text-[10px] text-red-400">Enter a valid email address</p>
              )}
            </div>

            {/* Pay button */}
            <button
              onClick={handlePaystack}
              disabled={paying || !isChangingPlan || !payEmail || !payEmail.includes('@')}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6D5EF9, #18D8FF)' }}
            >
              {paying ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Processing…</>
              ) : !isChangingPlan ? (
                'Current plan'
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M1 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V4zM1 9h18v6a1 1 0 01-1 1H2a1 1 0 01-1-1V9zm5 2a1 1 0 000 2h.01a1 1 0 000-2H6zm3 0a1 1 0 000 2h3a1 1 0 000-2H9z" />
                  </svg>
                  {hasSubscription ? `Switch to ${TIER_DEFS[selectedTier].name}` : `Subscribe to ${TIER_DEFS[selectedTier].name}`}
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-white/20">
              Secured by Paystack · Cancel anytime
            </p>

            {/* Selected-tier usage limits */}
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: `${TIER_DEFS[selectedTier].color}0f`, border: `1px solid ${TIER_DEFS[selectedTier].color}28` }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: TIER_DEFS[selectedTier].color }}>{TIER_DEFS[selectedTier].name} limits</p>
              <p className="text-[11px] text-white/40 leading-[1.6]">
                {limitLabel(TIER_LIMITS[selectedTier].maxHighIntentLeadsPerDay, 'HIGH-intent leads/day')} · {limitLabel(TIER_LIMITS[selectedTier].maxConnectedAccounts, 'connected accounts')} · {limitLabel(TIER_LIMITS[selectedTier].maxMentionsPerDay, 'mentions/day')}
              </p>
            </div>
          </div>

          {/* Currency converter card */}
          <div className="rounded-xl px-4 py-3" style={{ background: 'var(--a-card)', border: '1px solid var(--a-border)' }}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20">Price in both currencies</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">USD (monthly)</span>
                <span className="text-[12px] font-semibold text-white">${fmtUSD(TIER_PRICING[selectedTier].usd)}/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">NGN (monthly)</span>
                <span className="text-[12px] font-semibold text-white">₦{TIER_PRICING[selectedTier].ngn.toLocaleString()}/mo</span>
              </div>
              {billing === 'annual' && (
                <div style={{ borderTop: '1px solid var(--a-border)' }} className="pt-1.5 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/40">USD (annual, −20%)</span>
                    <span className="text-[12px] font-semibold text-[#10B981]">${fmtUSD(usdTotal)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-white/40">NGN (annual, −20%)</span>
                    <span className="text-[12px] font-semibold text-[#10B981]">₦{ngnTotal.toLocaleString()}/mo</span>
                  </div>
                </div>
              )}
              <p className="text-[9px] text-white/15 pt-1">Rate: 1 USD = ₦{NGN_RATE.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
