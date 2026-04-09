'use client';

import { useState, useRef, useEffect } from 'react';
import { toolsApi } from '@/lib/api';
import LeadCaptureModal, { LeadFormData } from '@/components/LeadCaptureModal';
import { downloadPdf } from '@/lib/downloadPdf';
import AnalysisLoader from '@/components/AnalysisLoader';

const CYBER_PATH_HINTS = [
  'Mapping your current skills to in-demand GRC roles (Risk, Audit, Compliance)…',
  'Researching GRC salary benchmarks for your target country…',
  'Identifying the fastest GRC certification path (Security+, CRISC, CISA, ISO 27001)…',
  'Aligning your roadmap to NIST, ISO 27001, SOC 2, HIPAA & PCI-DSS frameworks…',
  'Building your week-by-week 90-day GRC action plan…',
  'Matching you with the right EMC GRC program for your goals…',
  'Calculating realistic GRC Analyst → Senior GRC income milestones…',
  'Analysing GRC job market demand in your region…',
  'Selecting hands-on control-testing and audit exercises for your level…',
];

const LS_KEY = 'emc_cyber_path_finder_so';

// ── Markdown parser ────────────────────────────────────────────────────────

interface Phase {
  title: string;
  weekRange: string;
  body: string;
}

interface ParsedRoadmap {
  profileSummary: Record<string, string>;
  phases: Phase[];
  raw: string;
}

function parseRoadmap(text: string): ParsedRoadmap {
  const profile: Record<string, string> = {};
  const phases: Phase[] = [];

  // Extract profile summary block
  const profileMatch = text.match(/###\s*Profile Summary([\s\S]*?)(?=###|\n---)/i);
  if (profileMatch) {
    const lines = profileMatch[1].trim().split('\n');
    lines.forEach((line) => {
      const m = line.match(/[-*]\s*\*\*(.+?):\*\*\s*(.+)/);
      if (m) profile[m[1].trim()] = m[2].trim();
    });
  }

  // Split on phase headers: ### 1. Week X or ### Week X
  const phaseRegex = /###\s*(?:\d+\.\s*)?(Week\s[\d–\-]+[^:\n]*:?[^\n]*)/gi;
  const matches = Array.from(text.matchAll(phaseRegex));

  matches.forEach((match, idx) => {
    const titleLine = match[1].trim().replace(/:$/, '');
    const colonIdx = titleLine.indexOf(':');
    const weekRange = colonIdx > -1 ? titleLine.slice(0, colonIdx).trim() : titleLine;
    const phaseTitle = colonIdx > -1 ? titleLine.slice(colonIdx + 1).trim() : titleLine;

    const start = match.index! + match[0].length;
    const end = matches[idx + 1]?.index ?? text.length;
    const body = text.slice(start, end).trim();

    phases.push({ title: phaseTitle || weekRange, weekRange, body });
  });

  return { profileSummary: profile, phases, raw: text };
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="text-[#0BAAEF]/80">$1</em>')
    .replace(/\*{1,2}/g, '');
}

function RoadmapBody({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim() && l.trim() !== '---');

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed)) {
          return (
            <h2 key={i} className="text-white font-bold text-base mt-5 mb-2 first:mt-0">
              {trimmed.replace(/^##\s+/, '')}
            </h2>
          );
        }

        if (/^###\s+/.test(trimmed) && !/^####/.test(trimmed)) {
          return (
            <h3 key={i} className="text-white font-semibold text-sm mt-4 mb-1.5 first:mt-0 border-b border-brand-slate/30 pb-1">
              {trimmed.replace(/^###\s+/, '')}
            </h3>
          );
        }

        if (/^####\s+/.test(trimmed)) {
          return (
            <p key={i} className="text-[#0BAAEF] font-semibold text-xs uppercase tracking-wide mt-3 mb-1">
              {trimmed.replace(/^####\s+/, '')}
            </p>
          );
        }

        if (/^\s{2,}[-*]/.test(line)) {
          return (
            <div key={i} className="flex items-start gap-2 pl-5">
              <span className="text-[#0BAAEF]/60 mt-1.5 shrink-0 text-[10px]">◦</span>
              <span className="text-brand-light/80 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^[-*]\s*/, '')) }}
              />
            </div>
          );
        }

        if (/^[-*]\s/.test(trimmed)) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#0BAAEF] mt-1.5 shrink-0 text-xs">▸</span>
              <span className="text-brand-light text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^[-*]\s+/, '')) }}
              />
            </div>
          );
        }

        const boldHeadingMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
        if (boldHeadingMatch) {
          return (
            <h3 key={i} className="text-white font-semibold text-sm mt-4 mb-1.5 first:mt-0 border-b border-brand-slate/30 pb-1">
              {boldHeadingMatch[1]}
            </h3>
          );
        }

        if (/^\*\*[^*]+\*\*/.test(trimmed)) {
          return (
            <p key={i} className="text-white text-sm leading-relaxed mt-2"
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
            />
          );
        }

        if (trimmed) {
          return (
            <p key={i} className="text-brand-light/80 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

const COUNTRIES = [
  'United States', 'Canada', 'Mexico',
  'United Kingdom', 'Ireland', 'Germany', 'France', 'Netherlands',
  'Spain', 'Italy', 'Portugal', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Belgium', 'Switzerland', 'Austria', 'Poland', 'Czech Republic', 'Romania',
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Ethiopia', 'Uganda',
  'Tanzania', 'Rwanda', 'Cameroon', 'Senegal', 'Côte d\'Ivoire', 'Mali',
  'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Mozambique', 'Angola',
  'Sudan', 'Egypt', 'Morocco', 'Tunisia', 'Algeria', 'Libya',
  'Sierra Leone', 'Liberia', 'Gambia', 'Guinea', 'Togo', 'Benin',
  'Malawi', 'Eritrea', 'Somalia', 'DR Congo', 'Republic of Congo',
  'Brazil', 'Colombia', 'Argentina', 'Peru', 'Venezuela', 'Chile',
  'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay', 'Guatemala', 'Honduras',
  'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba',
  'Dominican Republic', 'Haiti', 'Jamaica', 'Trinidad and Tobago',
  'Puerto Rico', 'Barbados', 'Belize', 'Guyana', 'Suriname',
  'India', 'Philippines', 'Singapore', 'Japan', 'South Korea',
  'China', 'Hong Kong', 'Taiwan', 'Vietnam', 'Thailand', 'Malaysia',
  'Indonesia', 'Bangladesh', 'Pakistan', 'Sri Lanka', 'Nepal',
  'Australia', 'New Zealand',
  'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Jordan',
  'Lebanon', 'Israel', 'Turkey',
  'Other',
];

const INCOME_GOALS = [
  '$50,000 - $75,000',
  '$75,000 - $100,000',
  '$100,000 - $125,000',
  '$125,000 - $150,000',
  '$150,000 - $200,000',
  '$200,000+',
];

export default function CyberPathFinderSoPage() {
  const [formData, setFormData] = useState({
    current_job: '',
    country: '',
    income_goal: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [fullResult, setFullResult] = useState<any>(null);
  const [resultId, setResultId] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [activePage, setActivePage] = useState(0);

  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { previewResult: p, fullResult: f, resultId: r, formData: fd } = JSON.parse(saved);
        if (p) setPreviewResult(p);
        if (f) setFullResult(f);
        if (r) setResultId(r);
        if (fd) setFormData(fd);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (previewResult || fullResult) {
      localStorage.setItem(LS_KEY, JSON.stringify({ previewResult, fullResult, resultId, formData }));
    }
  }, [previewResult, fullResult, resultId, formData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.current_job.trim()) errs.current_job = 'Please enter your current job';
    if (!formData.country) errs.country = 'Please select your country';
    if (!formData.income_goal) errs.income_goal = 'Please select an income goal';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await toolsApi.submitCyberPathFinder(formData);
      setPreviewResult(res.data.preview);
      setResultId(res.data.result_id);
      setFullResult(null);
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (data: LeadFormData) => {
    try {
      const res = await toolsApi.unlockCyberPathFinder(data);
      setFullResult(res.data.full_result);
      setActivePage(0);
      setShowModal(false);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setPreviewResult(null);
        setResultId('');
        localStorage.removeItem(LS_KEY);
      }
      throw err;
    }
  };

  return (
    <div className="tool-page-container">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0BAAEF]/10 border border-[#0BAAEF]/20 rounded-full text-[#0BAAEF] text-xs font-medium mb-4">
          Free Tool
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Cyber Path Finder
        </h1>
        <p className="text-brand-muted max-w-xl mx-auto">
          Get a personalized GRC (Governance, Risk & Compliance) career roadmap based
          on your background, location, and income goals.
        </p>
      </div>

      {loading && (
        <AnalysisLoader
          title="Building Your Roadmap"
          subtitle={`Personalising your path from ${formData.current_job || 'your background'} → GRC`}
          hints={CYBER_PATH_HINTS}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      )}

      {!previewResult && !loading && (
        <div className="card max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.form && (
              <div className="p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-brand-danger text-sm">
                {errors.form}
              </div>
            )}

            <div>
              <label className="label-text">Current Job Title / Role</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. IT Support Specialist, Student, Accountant"
                value={formData.current_job}
                onChange={(e) => setFormData({ ...formData, current_job: e.target.value })}
              />
              {errors.current_job && <p className="error-text">{errors.current_job}</p>}
            </div>

            <div ref={countryRef} className="relative">
              <label className="label-text">Country</label>

              <button
                type="button"
                onClick={() => {
                  setCountryOpen((o) => !o);
                  setCountrySearch('');
                }}
                className={`select-field w-full text-left flex items-center justify-between ${
                  formData.country ? 'text-white' : 'text-brand-muted'
                }`}
              >
                <span>{formData.country || 'Select your country'}</span>
                <svg
                  className={`w-4 h-4 text-brand-muted transition-transform ${countryOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {countryOpen && (
                <div className="absolute z-50 w-full mt-1 bg-brand-dark border border-brand-slate rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-brand-slate">
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                      </svg>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search country..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        className="w-full bg-brand-navy border border-brand-slate rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-brand-muted focus:outline-none focus:border-[#0BAAEF]"
                      />
                    </div>
                  </div>

                  <ul className="max-h-52 overflow-y-auto">
                    {filteredCountries.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-brand-muted text-center">
                        No countries found
                      </li>
                    ) : (
                      filteredCountries.map((c) => (
                        <li key={c}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, country: c });
                              setCountryOpen(false);
                              setCountrySearch('');
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              formData.country === c
                                ? 'bg-[#0BAAEF]/20 text-[#0BAAEF] font-medium'
                                : 'text-brand-light hover:bg-brand-slate/40'
                            }`}
                          >
                            {formData.country === c && (
                              <span className="mr-2">✓</span>
                            )}
                            {c}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}

              {errors.country && <p className="error-text">{errors.country}</p>}
            </div>

            <div>
              <label className="label-text">Income Goal</label>
              <select
                className="select-field"
                value={formData.income_goal}
                onChange={(e) => setFormData({ ...formData, income_goal: e.target.value })}
              >
                <option value="">Select your target income</option>
                {INCOME_GOALS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {errors.income_goal && <p className="error-text">{errors.income_goal}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              Generate My Career Path
            </button>
          </form>
        </div>
      )}

      {previewResult && !fullResult && (
        <div className="animate-slide-up">
          <div className="card max-w-xl mx-auto mb-6 border border-[#0BAAEF]/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#0BAAEF] animate-pulse" />
              <h2 className="text-lg font-bold text-white">Your Roadmap Preview</h2>
              <span className="ml-auto text-xs px-2 py-0.5 bg-[#0BAAEF]/10 text-[#0BAAEF] rounded-full border border-[#0BAAEF]/20">
                30% Preview
              </span>
            </div>
            <div className="text-brand-light/90 text-sm leading-relaxed">
              <RoadmapBody text={typeof previewResult === 'string' ? previewResult : previewResult.roadmap || ''} />
            </div>
          </div>

          <div className="relative max-w-xl mx-auto">
            <div className="card opacity-40 blur-sm pointer-events-none select-none">
              <h3 className="text-lg font-bold text-white mb-3">Full Roadmap</h3>
              <div className="space-y-2 text-brand-muted text-sm">
                <p>Step 1: Complete foundational certification...</p>
                <p>Step 2: Build hands-on lab experience...</p>
                <p>Step 3: Develop specialized skills in...</p>
                <p>Step 4: Apply for entry-level positions...</p>
                <p>Step 5: Advance to senior role within...</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#0BAAEF]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#0BAAEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-3">
                  Unlock your full personalized roadmap
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-primary animate-pulse-glow"
                >
                  Unlock Full Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullResult && (() => {
        const rawText: string =
          typeof fullResult === 'string'
            ? fullResult
            : fullResult.roadmap || JSON.stringify(fullResult);

        const { profileSummary, phases } = parseRoadmap(rawText);
        const hasPhases = phases.length > 0;
        const totalPages = hasPhases ? phases.length : 1;
        const phase = hasPhases ? phases[activePage] : null;

        const phaseColors = [
          { border: 'border-[#0BAAEF]/40', bg: 'bg-[#0BAAEF]/5', badge: 'bg-[#0BAAEF]/20 text-[#0BAAEF]' },
          { border: 'border-[#40C4FF]/40',   bg: 'bg-[#40C4FF]/5',   badge: 'bg-[#40C4FF]/20 text-[#40C4FF]' },
          { border: 'border-purple-400/40',   bg: 'bg-purple-400/5',   badge: 'bg-purple-400/20 text-purple-300' },
          { border: 'border-orange-400/40',   bg: 'bg-orange-400/5',   badge: 'bg-orange-400/20 text-orange-300' },
        ];
        const color = phaseColors[activePage % phaseColors.length];

        return (
          <div className="max-w-2xl mx-auto animate-slide-up space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#0BAAEF]/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#0BAAEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Your 90-Day GRC Career Roadmap</h2>
                <p className="text-brand-muted text-sm">Personalised for your background and income goal</p>
              </div>
            </div>

            {Object.keys(profileSummary).length > 0 && (
              <div className="flex flex-wrap gap-3">
                {Object.entries(profileSummary).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-slate/40 rounded-full text-xs">
                    <span className="text-brand-muted">{k}:</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {hasPhases && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {phases.map((p, idx) => {
                  const c = phaseColors[idx % phaseColors.length];
                  return (
                    <button
                      key={idx}
                      onClick={() => setActivePage(idx)}
                      className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        activePage === idx
                          ? `${c.badge} ${c.border} border`
                          : 'bg-brand-slate/30 text-brand-muted border-brand-slate/30 hover:text-white'
                      }`}
                    >
                      {p.weekRange || `Phase ${idx + 1}`}
                    </button>
                  );
                })}
              </div>
            )}

            {hasPhases && phase ? (
              <div className={`card border ${color.border} ${color.bg}`}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2 ${color.badge}`}>
                      {phase.weekRange}
                    </span>
                    <h3 className="text-white font-bold text-lg">{phase.title}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-brand-muted text-xs">Phase</p>
                    <p className="text-white font-bold text-xl">{activePage + 1}/{totalPages}</p>
                  </div>
                </div>

                <RoadmapBody text={phase.body} />

                <div className="flex items-center justify-between mt-6 pt-5 border-t border-brand-slate/30">
                  <button
                    onClick={() => setActivePage((p) => Math.max(0, p - 1))}
                    disabled={activePage === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-brand-slate/40 text-brand-light hover:bg-brand-slate/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  <div className="flex gap-1.5">
                    {phases.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePage(idx)}
                        className={`rounded-full transition-all ${
                          activePage === idx
                            ? 'w-5 h-2 bg-[#0BAAEF]'
                            : 'w-2 h-2 bg-brand-slate hover:bg-brand-muted'
                        }`}
                      />
                    ))}
                  </div>

                  {activePage < totalPages - 1 ? (
                    <button
                      onClick={() => setActivePage((p) => Math.min(totalPages - 1, p + 1))}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#0BAAEF] text-brand-navy font-semibold hover:bg-[#0BAAEF]/90 transition-colors"
                    >
                      Next Phase
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#0BAAEF]/20 text-[#0BAAEF] border border-[#0BAAEF]/30">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Roadmap Complete
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card space-y-3">
                <RoadmapBody text={rawText} />
              </div>
            )}

            <div className="flex gap-3">
              {fullResult && (
                <button
                  onClick={() => downloadPdf({ title: '90-Day GRC Career Roadmap', subtitle: 'Personalised Governance, Risk & Compliance Transition Plan', meta: [ { label: 'Profile', value: formData.current_job }, { label: 'Location', value: formData.country }, { label: 'Income Goal', value: formData.income_goal } ], sections: [{ body: typeof fullResult === 'string' ? fullResult : (fullResult?.roadmap || '') }], filename: 'emc-grc-roadmap.pdf' })}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#0BAAEF]/30 text-[#0BAAEF] text-sm font-semibold hover:bg-[#0BAAEF]/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Roadmap
                </button>
              )}
              <button
                onClick={() => {
                  setPreviewResult(null);
                  setFullResult(null);
                  setActivePage(0);
                  setFormData({ current_job: '', country: '', income_goal: '' });
                  localStorage.removeItem(LS_KEY);
                }}
                className="flex-1 btn-secondary"
              >
                Generate a New Roadmap
              </button>
            </div>
          </div>
        );
      })()}

      <LeadCaptureModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleLeadSubmit}
        resultId={resultId}
        sourceTool="cyber-path-finder"
        leadSource="social"
      />
    </div>
  );
}
