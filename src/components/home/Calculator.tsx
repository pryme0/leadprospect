'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TIER_PRICING, TIER_LIMITS, fmtUSD } from '@/lib/subscription/tiers';

/* Real anchors from the actual plan config — no invented conversion rates. */
const ANCHORS = [
  { pct: 0, price: TIER_PRICING.basic.usd, leadsPerDay: TIER_LIMITS.basic.maxHighIntentLeadsPerDay ?? 0, name: 'Basic' },
  { pct: 50, price: TIER_PRICING.pro.usd, leadsPerDay: TIER_LIMITS.pro.maxHighIntentLeadsPerDay ?? 0, name: 'Pro' },
  { pct: 100, price: TIER_PRICING.max.usd, leadsPerDay: TIER_LIMITS.max.maxHighIntentLeadsPerDay ?? 0, name: 'Max' },
] as const;

function lerp(pct: number) {
  const [lo, hi] = pct <= 50 ? [ANCHORS[0], ANCHORS[1]] : [ANCHORS[1], ANCHORS[2]];
  const local = pct <= 50 ? pct / 50 : (pct - 50) / 50;
  const price = lo.price + (hi.price - lo.price) * local;
  const leadsPerDay = lo.leadsPerDay + (hi.leadsPerDay - lo.leadsPerDay) * local;
  const name = local < 0.5 ? lo.name : hi.name;
  return { price, leadsPerDay, name };
}

export default function Calculator() {
  const [pct, setPct] = useState(50);
  const { price, leadsPerDay, name } = useMemo(() => lerp(pct), [pct]);
  const leadsPerMonth = Math.round(leadsPerDay * 30);
  const costPerLead = leadsPerMonth > 0 ? price / leadsPerMonth : 0;

  return (
    <section className="bg-surface-bright py-24 md:py-32">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <span className="font-mono-label text-mono-label uppercase text-secondary">Plan calculator</span>
            <h2 className="font-display-lg text-display-lg-mobile mt-4 text-on-background md:text-display-lg">
              See what your budget gets you.
            </h2>
            <p className="mt-5 font-body-md text-body-md text-on-surface-variant">
              Real numbers from our actual plans — drag the slider between Basic and Max.
            </p>
            <Link
              href="/pricing"
              className="mt-8 inline-flex items-center gap-2 font-body-md font-bold text-primary hover:underline"
            >
              See full pricing
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-glass-stroke bg-surface-container-lowest p-8 md:p-10">
              <div className="mb-10 flex items-baseline justify-between">
                <div>
                  <p className="font-mono-label text-mono-label uppercase text-outline">Monthly budget</p>
                  <p className="font-display-lg text-4xl font-bold text-on-background">${fmtUSD(price)}</p>
                </div>
                <span className="rounded-full bg-primary-container px-4 py-1.5 font-mono-label text-mono-label uppercase text-on-primary-container">
                  {name} plan
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-variant accent-primary"
                aria-label="Monthly budget slider"
              />
              <div className="mt-2 flex justify-between font-mono-label text-mono-label text-outline">
                <span>${fmtUSD(TIER_PRICING.basic.usd)} · Basic</span>
                <span>${fmtUSD(TIER_PRICING.pro.usd)} · Pro</span>
                <span>${fmtUSD(TIER_PRICING.max.usd)} · Max</span>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-6 border-t border-glass-stroke pt-8 md:grid-cols-3">
                <Metric label="Ready-to-buy leads / day" value={Math.round(leadsPerDay).toLocaleString()} />
                <Metric label="Ready-to-buy leads / month" value={leadsPerMonth.toLocaleString()} />
                <Metric label="Cost per lead" value={`$${costPerLead.toFixed(2)}`} accent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className={`font-mono-data text-2xl font-bold ${accent ? 'text-primary' : 'text-on-background'}`}>{value}</p>
      <p className="mt-1 font-mono-label text-mono-label uppercase text-outline">{label}</p>
    </div>
  );
}
