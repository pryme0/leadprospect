'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLAN_TIERS, TIER_DEFS, TIER_PRICING, TIER_LIMITS, fmtUSD } from '@/lib/subscription/tiers';

const limitLabel = (n: number | null, unit = '') => (n === null ? 'Unlimited' : unit ? `${n} ${unit}` : String(n));

// Plain-language FAQ shown on the page. The exact same Q&A text is mirrored in
// the FAQ JSON-LD in ./layout.tsx — Google requires the schema to match what's
// visible on the page, so keep the two in sync when editing.
const FAQS = [
  {
    q: 'Can I switch plans after I sign up?',
    a: 'Yes. You can switch between Basic, Pro, and Max anytime in your settings. When you switch, you pay the new price straight away.',
  },
  {
    q: 'What happens to my customers and business mentions if I move to a smaller plan?',
    a: 'Nothing is ever deleted. A smaller plan just lowers how many you get each day from then on. Everything you already have stays in your account, and it all comes back when you upgrade again.',
  },
  {
    q: 'How many customers and mentions do I get each day?',
    a: 'Basic gives you 10 people ready to buy and 10 business mentions a day. Pro gives you 20 people a day and 200 business mentions. Max gives you 30 to 40 people ready to buy a day, plus every mention of your business.',
  },
  {
    q: 'Do I have to sign up for a long time?',
    a: 'No. Monthly plans can be cancelled anytime. If you pay for a year up front, you save 20%. Yearly plans can be refunded within the first 30 days.',
  },
  {
    q: 'How many team members can use one account?',
    a: 'Basic is for 1 team member, Pro is for 5, and Max has no limit.',
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto overflow-hidden">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-glass-stroke">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-mono-label text-mono-label uppercase text-tertiary">Clear, honest pricing</span>
          </div>
          <h1 className="font-display-xl text-display-xl md:text-display-xl text-on-background">
            Simple pricing that <span className="text-primary">grows with you</span>
          </h1>
          <p className="text-on-surface-variant font-body-lg text-body-lg">
            Pick a plan and cancel anytime. No hidden fees.
          </p>
          {/* Pricing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-12">
            <span className="text-on-surface-variant font-body-md">Monthly</span>
            <div
              className={`w-14 h-7 rounded-full p-1 cursor-pointer relative border border-glass-stroke transition-colors ${
                isYearly ? 'bg-primary-container' : 'bg-surface-container-high'
              }`}
              id="pricing-toggle"
              onClick={() => setIsYearly((v) => !v)}
            >
              <div
                className={`w-5 h-5 bg-primary rounded-full transition-transform transform ${
                  isYearly ? 'translate-x-7' : 'translate-x-0'
                }`}
                id="toggle-knob"
              ></div>
            </div>
            <span className="text-on-background font-bold font-body-md">
              Annual <span className="text-tertiary text-sm ml-1 font-mono-label">(Save 20%)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {PLAN_TIERS.map((tier) => {
            const def = TIER_DEFS[tier];
            const pricing = TIER_PRICING[tier];
            const monthly = isYearly ? Math.round(pricing.usd * 0.8) : pricing.usd;
            const isFeatured = tier === 'pro';
            return (
              <div
                key={tier}
                className={`glass-card p-8 rounded-xl flex flex-col h-full transition-all duration-300 relative overflow-hidden ${
                  isFeatured ? 'border-primary/60 glow-primary transform md:-translate-y-4' : 'hover:border-primary/40'
                }`}
              >
                {isFeatured && (
                  <div className="absolute top-0 right-0 bg-primary-container text-on-primary-container px-4 py-1 text-xs font-mono-label rounded-bl-lg uppercase">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className={`font-headline-md text-headline-md mb-2 ${isFeatured ? 'text-primary' : ''}`}>{def.name}</h3>
                  <p className="text-on-surface-variant text-sm">{def.tagline}</p>
                </div>
                <div className="mb-8 flex items-baseline gap-1">
                  {isYearly && (
                    <span className="text-on-surface-variant text-lg line-through opacity-50">${fmtUSD(pricing.usd)}</span>
                  )}
                  <span className="font-display-lg text-display-lg">${fmtUSD(monthly)}</span>
                  <span className="text-on-surface-variant">/mo</span>
                </div>
                <ul className="space-y-4 mb-12 flex-grow">
                  {def.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                      <span className="text-on-surface">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={
                    isFeatured
                      ? 'w-full py-4 bg-primary-container text-on-primary-container rounded-lg font-bold shadow-lg shadow-primary-container/20 hover:brightness-110 active:scale-95 transition-all text-center'
                      : 'w-full py-4 border border-primary text-primary rounded-lg font-bold hover:bg-primary/10 transition-colors active:scale-95 text-center'
                  }
                >
                  {tier === 'basic' ? 'Choose Basic' : tier === 'pro' ? 'Choose Pro' : 'Choose Max'}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto overflow-x-auto">
        <h2 className="font-display-lg text-display-lg text-center mb-16">
          Compare <span className="text-secondary">plans</span>
        </h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-glass-stroke text-left">
              <th className="py-6 font-mono-label text-mono-label uppercase text-on-surface-variant">Feature</th>
              <th className="py-6 font-headline-md text-headline-md">Basic</th>
              <th className="py-6 font-headline-md text-headline-md text-primary">Pro</th>
              <th className="py-6 font-headline-md text-headline-md">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-stroke">
            <tr>
              <td className="py-6 font-semibold">People ready to buy / day</td>
              <td className="py-6 text-on-surface-variant">{limitLabel(TIER_LIMITS.basic.maxHighIntentLeadsPerDay, '')}</td>
              <td className="py-6 text-on-surface">{limitLabel(TIER_LIMITS.pro.maxHighIntentLeadsPerDay, '')}</td>
              <td className="py-6 text-on-surface">{limitLabel(TIER_LIMITS.max.maxHighIntentLeadsPerDay, '')}</td>
            </tr>
            <tr>
              <td className="py-6 font-semibold">Connected accounts</td>
              <td className="py-6 text-on-surface-variant">{TIER_LIMITS.basic.maxConnectedAccounts}</td>
              <td className="py-6 text-on-surface">{TIER_LIMITS.pro.maxConnectedAccounts}</td>
              <td className="py-6 text-on-surface">{TIER_LIMITS.max.maxConnectedAccounts}</td>
            </tr>
            <tr>
              <td className="py-6 font-semibold">Business mentions / day</td>
              <td className="py-6 text-on-surface-variant">{limitLabel(TIER_LIMITS.basic.maxMentionsPerDay, '')}</td>
              <td className="py-6 text-on-surface">{limitLabel(TIER_LIMITS.pro.maxMentionsPerDay, '')}</td>
              <td className="py-6 text-on-surface">{limitLabel(TIER_LIMITS.max.maxMentionsPerDay, '')}</td>
            </tr>
            <tr>
              <td className="py-6 font-semibold">Team members</td>
              <td className="py-6 text-on-surface-variant">{limitLabel(TIER_LIMITS.basic.seats, '')}</td>
              <td className="py-6 text-on-surface">{limitLabel(TIER_LIMITS.pro.seats, '')}</td>
              <td className="py-6 text-on-surface">{limitLabel(TIER_LIMITS.max.seats, '')}</td>
            </tr>
            <tr>
              <td className="py-6 font-semibold">Email tools</td>
              <td className="py-6">
                <span className="material-symbols-outlined text-outline">close</span>
              </td>
              <td className="py-6">
                <span className="material-symbols-outlined text-primary">check_circle</span>
              </td>
              <td className="py-6">
                <span className="material-symbols-outlined text-primary">check_circle</span>
              </td>
            </tr>
            <tr>
              <td className="py-6 font-semibold">Connects to your tools</td>
              <td className="py-6">
                <span className="material-symbols-outlined text-outline">close</span>
              </td>
              <td className="py-6">
                <span className="material-symbols-outlined text-primary">check_circle</span>
              </td>
              <td className="py-6">
                <span className="material-symbols-outlined text-primary">check_circle</span>
              </td>
            </tr>
            <tr>
              <td className="py-6 font-semibold">Team tools</td>
              <td className="py-6">
                <span className="material-symbols-outlined text-outline">close</span>
              </td>
              <td className="py-6">
                <span className="material-symbols-outlined text-outline">close</span>
              </td>
              <td className="py-6">
                <span className="material-symbols-outlined text-primary">check_circle</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* FAQ */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <h2 className="font-display-lg text-display-lg text-center mb-16">
          Common <span className="text-secondary">questions</span>
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {FAQS.map((item) => (
            <div key={item.q} className="glass-card p-8 rounded-xl">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{item.q}</h3>
              <p className="text-on-surface-variant font-body-md text-body-md">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof Logos */}
      <section className="py-16 bg-surface-container-lowest">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center">
          <p className="font-mono-label text-mono-label text-on-surface-variant uppercase mb-10 tracking-widest">
            Trusted by growing African businesses
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div
              className="h-8 w-32 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCCPi7eSNf48UzkMFqJ_ShSiTDFNHGSaU5Kkll-GP4IuT7BwSRismfFJ-2Vms3OEmMgeX48r2x75UoU0RNTXkX2-ydP6bfMQ3kQ8NdkXjxJCGnryr7Cx8QrUg0FAwV076rh3ns_gUb3m37Grdc--iNz5fDUw-m98xHcxAU80Ki1tH-34d-6VyFZ9SojamrcaG93P3TdlYcod7YC7dUnNqW5mLPQcBfETTjXYO-oCjtMWxcc-xTM2LKwtlVAluaR3DqwldXvqiVGbdRi')",
              }}
            ></div>
            <div
              className="h-8 w-32 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAUC8XVjMYivI9RVwTgAie75ZXSZmvLlPRblOlv9VVX_iVLROR6jRWuVXGegSb7K04riY2nUdtAzdcEvD97QkVPbKameWbVNc8pG9mldROZP4m4xmuOnmdARAmsJMf2zcJ4Yvwg-6OvwdxfH89ptneTw1UO0wYam63UuNsq8X89qE2dDqtLycr-cKaDCxVIEomIaxsKRfujA9yRSciVhfNeUlEn1EgfcLlw6ARiouFarC2xC86JHb_BHpb2FwIgdC63jtFO__MNITeJ')",
              }}
            ></div>
            <div
              className="h-8 w-32 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDVAOxSOpVI7JyvDtVw4lFv5lIM5Uec2h6GQPKWnmn2LsIc7KSKOR9QFNy8vYqfnEuYXWjbAhXcCouG359gyPbE0SG_EXrl8IBUkJ0I6UgkDOV7vjydPUSk9CWr_rdGkBsyiKA0Ps7JH8njeGBp_0eYwt5YNG65YnoBqrwBlNQnyFAh2mj-nNPsvgylVOOvB5iXyOkV-boMmroLfKH_dKurXaPBu8ATGnzPsvnRtrAW2QjAK3AttvMEs8QbVhydD_l6cX3B4VqgkExg')",
              }}
            ></div>
            <div
              className="h-8 w-32 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC72AcOTIhgBuQ34Hg7-WwZnJ8dPadzAWR0IkR8nrN4vPVsK1o4UXIS7eiHEvONExWsM7Rsoa4AMhBBukJOaHDqp4U8BkxK2WnpN5Gw40Y1VNX44gSHBpwOkQ9JV1-QTOv__jcY9mR1xK54UYbRRNjh52P8FByXuVZ9RXP5Wx9t52urvrutBtebITrvt2XezDR9PTvJyq9iwKhFfevSE85mpauXBU9mXhE6SAyHtUYXxfbHsWUnvKIBz9NF56gdrk2KZ0Pa1u2io1yF')",
              }}
            ></div>
            <div
              className="h-8 w-32 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBH51cRSTCPGUZKyanxJuFhVN8B6oof4sSCe4UtJevTUt8r2DMW1eLzeMGwsXr0KdV_LG9ZmfUOkjzcAt60kGfwA3W7X--qUtxLM10NX4NCsrmNLKSXaw6kUHkMt1qdX8NPfOqNT0XA5V4PYqw067Uodozs9RYsUbUvd56LgFxFl60-uAIZqtMYYlY1G17G2aF1woYabDlqfyjyybwgVp_ANagpaYqjtLy_zzKwcFu809astQL0cPeNdipwyihalBE47jPgVWSHaNkK')",
              }}
            ></div>
          </div>
        </div>
      </section>
    </>
  );
}
