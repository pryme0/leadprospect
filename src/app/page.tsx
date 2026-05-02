'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';
import HomepagePromptOrchestrator from '@/components/HomepagePromptOrchestrator';

// ── Terminal lines ────────────────────────────────────────────────────────────
const TERM_LINES = [
  { text: '$ analyzing profile...', color: '#ffffff60', delay: 0.1 },
  { text: '✓  Background: Healthcare (Nurse)', color: '#0BAAEF', delay: 0.5 },
  { text: '✓  Location: United States', color: '#0BAAEF', delay: 0.9 },
  { text: '✓  Income Goal: $100k+', color: '#0BAAEF', delay: 1.3 },
  { text: '> Calculating optimal path...', color: '#ffffff60', delay: 1.8 },
  { text: '✓  Track: GRC Analyst → IT Auditor → Risk Manager', color: '#40C4FF', delay: 2.4 },
  { text: '✓  Timeline: 90 days to GRC job-ready', color: '#40C4FF', delay: 2.8 },
  { text: '✓  Cert Path: Security+ → CRISC → CISA', color: '#40C4FF', delay: 3.2 },
  { text: '> Roadmap ready. Unlock your results ↓', color: '#f97316', delay: 3.8 },
];

// ── Tools data ────────────────────────────────────────────────────────────────
const tools = [
  {
    title: 'Cyber Path Finder',
    description:
      'Get a personalized 90-day GRC (Governance, Risk & Compliance) roadmap built around your background, country, and income goal. Discover the fastest route from where you are to a GRC Analyst, IT Auditor, or Risk Analyst role.',
    href: '/tools/cyber-path-finder',
    badge: 'Most Popular',
    badgeColor: '#0BAAEF',
    accentColor: '#0BAAEF',
    size: 'large',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    details: ['Personalized 90-day GRC plan', 'GRC cert paths (CRISC, CISA, ISO 27001)', 'GRC salary benchmarks'],
  },
  {
    title: 'Career Assessment',
    description:
      'Take our 8-question readiness quiz to uncover your skill gaps and get a tailored learning plan for breaking into GRC (Governance, Risk & Compliance) from any background.',
    href: '/tools/career-assessment',
    badge: 'Quick Quiz',
    badgeColor: '#40C4FF',
    accentColor: '#40C4FF',
    size: 'small',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    details: ['8 targeted questions', 'Skill gap analysis', 'Learning plan'],
  },
  {
    title: 'Resume Analyzer',
    description:
      'Upload your resume and get AI-powered feedback to optimize it for GRC roles (Analyst, Auditor, Risk, Compliance) — specific improvements that land more interviews.',
    href: '/tools/resume-analyzer',
    badge: 'AI Powered',
    badgeColor: '#6366f1',
    accentColor: '#6366f1',
    size: 'small',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    details: ['PDF upload', '5 targeted improvements', 'ATS optimization tips'],
  },
];

// Amplitude `tool_card_click` tool_name values for the bento-grid cards
// (homepage "Three Tools" section). The `_2` suffix distinguishes this
// placement from other tool-card surfaces (e.g. final CTA = `_3`).
const BENTO_TRACKING_NAMES: Record<string, string> = {
  '/tools/cyber-path-finder': 'cyber_path_finder2',
  '/tools/career-assessment': 'career_assessment2',
  '/tools/resume-analyzer': 'resume_analyzer2',
};

const STEPS = [
  {
    num: '01',
    title: 'Choose a Tool',
    desc: 'Pick the tool that matches where you are — career starter, career changer, or resume polisher.',
    color: '#0BAAEF',
  },
  {
    num: '02',
    title: 'AI Analyzes Your Profile',
    desc: 'AI processes your inputs against real GRC hiring data, frameworks, and career trajectories.',
    color: '#40C4FF',
  },
  {
    num: '03',
    title: 'Unlock Your Results',
    desc: 'Submit your details to receive your full personalized plan — roadmap, gaps, or resume feedback.',
    color: '#6366f1',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Lead-capture prompt — fires on a timed cadence + exit-intent so we
          don't leave the homepage as a silent bounce. */}
      <HomepagePromptOrchestrator />

      {/* ── Background dot grid ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          zIndex: 0,
        }}
      />

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center" style={{ zIndex: 1 }}>
        {/* Glow blobs */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(11,170,239,0.06) 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(64,196,255,0.05) 0%, transparent 70%)', transform: 'translate(20%, 20%)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-8"
                style={{ background: 'rgba(11,170,239,0.08)', borderColor: 'rgba(11,170,239,0.25)', color: '#0BAAEF' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0BAAEF]"
                  style={{ animation: 'blink 1.4s ease-in-out infinite' }} />
                AI-Powered · Free Forever · No Signup Required
              </div>

              <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
                Your Cybersecurity<br />
                Career{' '}
                <span className="relative inline-block">
                  <span className="gradient-text">Starts Here</span>
                  {/* Underline accent */}
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg,#0BAAEF,#40C4FF)' }} />
                </span>
              </h1>

              <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-lg">
                Free, AI-powered tools to break into cybersecurity — no matter your background.
                Get a personalized roadmap, find your skill gaps, and optimize your resume.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link href="/tools/cyber-path-finder"
                  onClick={() => track('hero_cta_click', { cta_name: 'find_cyberpath' })}
                  className="btn-primary text-base px-7 py-3.5 rounded-xl font-bold">
                  Find Your Cyber Path →
                </Link>
                <Link href="/tools/career-assessment"
                  onClick={() => track('hero_cta_click', { cta_name: 'take_assessment' })}
                  className="btn-secondary text-base px-7 py-3.5 rounded-xl font-bold">
                  Take the Assessment
                </Link>
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: '✦', text: '10,000+ paths generated' },
                  { icon: '✦', text: 'Claude AI powered' },
                  { icon: '✦', text: 'Results in 60 seconds' },
                ].map((chip) => (
                  <div key={chip.text}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-white/40 border border-white/8"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-[#0BAAEF] text-[10px]">{chip.icon}</span>
                    {chip.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — terminal */}
            <div className="relative" style={{ animation: 'floatY 6s ease-in-out infinite' }}>
              {/* Glow behind terminal */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: '0 0 80px 20px rgba(11,170,239,0.08)', zIndex: -1 }} />

              <div className="rounded-2xl border border-white/8 overflow-hidden"
                style={{ background: '#060e18', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>

                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5"
                  style={{ background: '#0b1520' }}>
                  <span className="w-3 h-3 rounded-full bg-red-500/70" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <span className="w-3 h-3 rounded-full bg-green-500/70" />
                  <span className="ml-3 text-white/30 text-xs font-mono">EMC Path Engine v1.0 — AI Career Analyzer</span>
                </div>

                {/* Terminal body */}
                <div className="p-6 font-mono text-sm space-y-2.5 relative overflow-hidden">
                  {/* Scanline effect */}
                  <div className="absolute inset-x-0 h-12 pointer-events-none"
                    style={{
                      background: 'linear-gradient(transparent, rgba(11,170,239,0.03), transparent)',
                      animation: 'scanline 4s linear infinite',
                      zIndex: 1,
                    }} />

                  {TERM_LINES.map((line, i) => (
                    <div key={i}
                      style={{
                        color: line.color,
                        opacity: 0,
                        animation: `termLine 0.4s ease forwards`,
                        animationDelay: `${line.delay}s`,
                      }}>
                      {line.text}
                    </div>
                  ))}

                  {/* Cursor */}
                  <div className="flex items-center gap-1 pt-1" style={{ color: '#ffffff40' }}>
                    <span>$</span>
                    <span className="w-2 h-4 rounded-sm bg-[#0BAAEF]"
                      style={{ animation: 'blink 1s step-end infinite' }} />
                  </div>
                </div>

                {/* Terminal footer CTA */}
                <div className="px-6 pb-5">
                  <Link href="/tools/cyber-path-finder"
                    onClick={() => track('hero_cta_click', { cta_name: 'generate_roadmap' })}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-[#050d14] transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#0BAAEF,#40C4FF)' }}>
                    Generate My Roadmap
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="relative border-y border-white/5 py-6" style={{ zIndex: 1, background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-white/5">
            {[
              { value: '10,000+', label: 'Career Paths Generated', color: '#0BAAEF' },
              { value: '5,000+',  label: 'Assessments Completed',  color: '#40C4FF' },
              { value: '3,000+',  label: 'Resumes Analyzed',       color: '#6366f1' },
              { value: '95%',     label: 'User Satisfaction',      color: '#f97316' },
            ].map((s) => (
              <div key={s.label} className="text-center md:px-6">
                <div className="text-3xl font-extrabold mb-0.5" style={{ color: s.color }}>{s.value}</div>
                <div className="text-white/35 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tools — Bento grid ── */}
      <section className="relative py-24" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="mb-12">
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0BAAEF' }}>
              Free Tools
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              Three Tools. One Goal:<br />
              <span className="gradient-text">Get You Into Cybersecurity.</span>
            </h2>
          </div>

          {/* Bento: top row 2/3 + 1/3 */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* Large card — Cyber Path Finder */}
            <Link href={tools[0].href}
              onClick={() => track('tool_card_click', { tool_name: BENTO_TRACKING_NAMES[tools[0].href] })}
              className="lg:col-span-2 group relative rounded-2xl border border-white/6 p-8 flex flex-col overflow-hidden transition-all duration-300 hover:border-[#0BAAEF]/30"
              style={{ background: 'linear-gradient(135deg, #0b1a14 0%, #08121c 100%)' }}>
              {/* Corner glow */}
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(11,170,239,0.12) 0%, transparent 70%)' }} />

              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(11,170,239,0.12)', color: '#0BAAEF' }}>
                  {tools[0].icon}
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(11,170,239,0.15)', color: '#0BAAEF', border: '1px solid rgba(11,170,239,0.3)' }}>
                  {tools[0].badge}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#0BAAEF] transition-colors">
                {tools[0].title}
              </h3>
              <p className="text-white/40 text-sm leading-relaxed mb-6 flex-1">
                {tools[0].description}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {tools[0].details.map((d) => (
                  <span key={d} className="text-xs px-2.5 py-1 rounded-full border text-white/50"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    {d}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[#0BAAEF] text-sm font-semibold">
                Get My Roadmap
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Small cards stack */}
            <div className="flex flex-col gap-4">
              {tools.slice(1).map((tool) => (
                <Link key={tool.href} href={tool.href}
                  onClick={() => track('tool_card_click', { tool_name: BENTO_TRACKING_NAMES[tool.href] })}
                  className="group relative rounded-2xl border border-white/6 p-6 flex flex-col overflow-hidden transition-all duration-300 flex-1"
                  style={{
                    background: 'linear-gradient(135deg, #0b1220 0%, #08121c 100%)',
                    ['--hover-border' as any]: `${tool.accentColor}4d`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${tool.accentColor}4d`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
                  <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${tool.accentColor}14 0%, transparent 70%)` }} />

                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${tool.accentColor}15`, color: tool.accentColor }}>
                      {tool.icon}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${tool.accentColor}18`, color: tool.accentColor, border: `1px solid ${tool.accentColor}35` }}>
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 transition-colors"
                    style={{ ['--tw-text-opacity' as any]: 1 }}>
                    {tool.title}
                  </h3>
                  <p className="text-white/35 text-xs leading-relaxed flex-1 mb-4">
                    {tool.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: tool.accentColor }}>
                    Get Started
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative py-20 border-t border-white/5" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#40C4FF' }}>
              How It Works
            </div>
            <h2 className="text-3xl font-extrabold text-white">
              From Zero to Roadmap in 60 Seconds
            </h2>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px"
              style={{ background: 'linear-gradient(90deg, #0BAAEF40, #40C4FF40, #6366f140)' }} />

            {STEPS.map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                {/* Number circle */}
                <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-xl font-black text-white z-10"
                  style={{ background: `${step.color}12`, border: `1px solid ${step.color}35`, color: step.color }}>
                  {step.num}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-20" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden p-px"
            style={{ background: 'linear-gradient(135deg, #0BAAEF40, #40C4FF20, #6366f130)' }}>
            <div className="rounded-3xl px-10 py-14 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0a1a14, #08121f)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(11,170,239,0.08) 0%, transparent 60%)' }} />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#0BAAEF' }}>
                  Ready to Start?
                </div>
                <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
                  Your cybersecurity career<br />is one click away.
                </h2>
                <p className="text-white/40 mb-8 max-w-md mx-auto">
                  Free tools. No account needed. Real AI. Real results.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/tools/cyber-path-finder"
                    onClick={() => track('hero_cta_click', { cta_name: 'find_cyberpath2' })}
                    className="btn-primary text-base px-8 py-3.5 rounded-xl font-bold">
                    Find Your Cyber Path →
                  </Link>
                  <Link href="/tools/resume-analyzer"
                    onClick={() => track('hero_cta_click', { cta_name: 'analyse_resume' })}
                    className="btn-secondary text-base px-8 py-3.5 rounded-xl font-bold">
                    Analyze My Resume
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
