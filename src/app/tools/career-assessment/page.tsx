'use client';

import { useState, useEffect, useRef } from 'react';
import { toolsApi } from '@/lib/api';
import { track } from '@/lib/analytics';
import LeadCaptureModal, { LeadFormData } from '@/components/LeadCaptureModal';
import { downloadPdf } from '@/lib/downloadPdf';
import AnalysisLoader from '@/components/AnalysisLoader';
import MarkdownBody from '@/components/MarkdownBody';

const LS_KEY = 'emc_career_assessment';

const ASSESSMENT_HINTS = [
  'Scoring your answers against GRC role readiness benchmarks…',
  'Identifying skills that translate into audit, risk & compliance work…',
  'Mapping your profile to GRC career tracks (GRC Analyst, IT Auditor, Risk Analyst)…',
  'Calculating your GRC readiness score across 8 dimensions…',
  'Recommending the right EMC GRC program for your level…',
  'Estimating your realistic timeline to a first GRC role…',
  'Analysing GRC hiring demand (ISO 27001, SOC 2, NIST, SOX) in your region…',
  'Personalising your GRC certification roadmap (Security+, CRISC, CISA, ISO 27001)…',
];

// Markdown rendering is handled by the shared MarkdownBody component

// Question IDs and option keys match the backend scoring engine exactly
interface Question {
  id: string;
  text: string;
  options: { value: string; label: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What is your current level of experience with IT or technology?',
    options: [
      { value: 'a', label: 'No experience — I am completely new to tech' },
      { value: 'b', label: 'Basic — I use computers daily but have no formal IT training' },
      { value: 'c', label: 'Intermediate — I have some IT certifications or a related degree' },
      { value: 'd', label: 'Advanced — I currently work in IT or a related field' },
    ],
  },
  {
    id: 'q2',
    text: 'What motivates you most to explore a GRC (Governance, Risk & Compliance) career?',
    options: [
      { value: 'a', label: 'High salary potential' },
      { value: 'b', label: 'Job security and growing demand' },
      { value: 'c', label: 'Passion for technology and problem-solving' },
      { value: 'd', label: 'I want to protect organizations from cyber threats' },
    ],
  },
  {
    id: 'q3',
    text: 'How soon are you looking to transition into a GRC role?',
    options: [
      { value: 'a', label: 'Immediately — I need a career change now' },
      { value: 'b', label: 'Within the next 3–6 months' },
      { value: 'c', label: 'Within the next year' },
      { value: 'd', label: 'Just exploring for now' },
    ],
  },
  {
    id: 'q4',
    text: 'Do you have any cybersecurity or GRC certifications?',
    options: [
      { value: 'a', label: 'None' },
      { value: 'b', label: 'CompTIA Security+ or equivalent' },
      { value: 'c', label: 'CRISC, CISA, CGRC, or ISO 27001 Lead Implementer' },
      { value: 'd', label: 'Multiple certifications across domains' },
    ],
  },
  {
    id: 'q5',
    text: 'What best describes your current employment situation?',
    options: [
      { value: 'a', label: 'Unemployed and actively seeking work' },
      { value: 'b', label: 'Employed in a non-tech role, looking to switch' },
      { value: 'c', label: 'Employed in IT, wanting to specialize in security' },
      { value: 'd', label: 'Student or recent graduate' },
    ],
  },
  {
    id: 'q6',
    text: 'How many hours per week can you dedicate to learning GRC skills?',
    options: [
      { value: 'a', label: 'Less than 5 hours' },
      { value: 'b', label: '5–10 hours' },
      { value: 'c', label: '10–20 hours' },
      { value: 'd', label: 'More than 20 hours' },
    ],
  },
  {
    id: 'q7',
    text: 'Which area of GRC interests you the most?',
    options: [
      { value: 'a', label: 'IT Audit & control testing (CISA path)' },
      { value: 'b', label: 'Risk management & risk assessments (CRISC path)' },
      { value: 'c', label: 'Compliance & framework implementation (ISO 27001, SOC 2, NIST)' },
      { value: 'd', label: 'I am not sure yet' },
    ],
  },
  {
    id: 'q8',
    text: 'What is your target annual income in a GRC role?',
    options: [
      { value: 'a', label: 'Under $60,000' },
      { value: 'b', label: '$60,000 – $90,000' },
      { value: 'c', label: '$90,000 – $130,000' },
      { value: 'd', label: 'Over $130,000' },
    ],
  },
];

export default function CareerAssessmentPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [fullResult, setFullResult] = useState<any>(null);
  const [resultId, setResultId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const hasTrackedStartRef = useRef(false);
  const hasTrackedResultViewRef = useRef(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { previewResult: p, fullResult: f, resultId: r, answers: a, currentQ: q } = JSON.parse(saved);
        if (p) setPreviewResult(p);
        if (f) setFullResult(f);
        if (r) setResultId(r);
        if (a) setAnswers(a);
        if (q != null) setCurrentQ(q);
      }
    } catch {}
  }, []);

  // Persist on change
  useEffect(() => {
    if (previewResult || fullResult || Object.keys(answers).length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify({ previewResult, fullResult, resultId, answers, currentQ }));
    }
  }, [previewResult, fullResult, resultId, answers, currentQ]);

  // Fire result_viewed once per page mount when the full (unlocked)
  // result first appears. Fires on live unlock AND on localStorage
  // restore since both are genuine views.
  useEffect(() => {
    if (fullResult && !hasTrackedResultViewRef.current) {
      track('result_viewed', { result_name: 'career_assesment_completed' });
      hasTrackedResultViewRef.current = true;
    }
  }, [fullResult]);

  const progress = ((currentQ) / QUESTIONS.length) * 100;
  const question = QUESTIONS[currentQ];
  const isLastQuestion = currentQ === QUESTIONS.length - 1;
  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const handleSelect = (value: string) => {
    if (!hasTrackedStartRef.current) {
      track('tool_started', { tool_name: 'career_assessment' });
      hasTrackedStartRef.current = true;
    }
    setAnswers({ ...answers, [question.id]: value });
  };

  const handleNext = async () => {
    if (!answers[question.id]) return;

    if (isLastQuestion) {
      setLoading(true);
      setError('');
      try {
        const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
          question_id,
          answer,
        }));
        const res = await toolsApi.submitCareerAssessment({ answers: answersArray });
        setPreviewResult(res.data.preview);
        setResultId(res.data.result_id);
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Midpoint telemetry: fire when advancing past question 4 (the 4th of 8).
      // currentQ is 0-indexed, so Q4 = currentQ === 3.
      if (currentQ === 3) {
        track('tool_cta_clicked', { cta_name: 'career_assessment_midstep4' });
      }
      setCurrentQ(currentQ + 1);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  const handleLeadSubmit = async (data: LeadFormData) => {
    try {
      const res = await toolsApi.unlockCareerAssessment(data);
      setFullResult(res.data.full_result);
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

  const resetQuiz = () => {
    setCurrentQ(0);
    setAnswers({});
    setPreviewResult(null);
    setFullResult(null);
    setResultId('');
    localStorage.removeItem(LS_KEY);
  };

  return (
    <div className="tool-page-container">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#40C4FF]/10 border border-[#40C4FF]/20 rounded-full text-[#40C4FF] text-xs font-medium mb-4">
          8-Question Quiz
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          GRC Career Readiness Assessment
        </h1>
        <p className="text-brand-muted max-w-xl mx-auto">
          Answer 8 quick questions to discover your readiness for a Governance, Risk &
          Compliance (GRC) career and get a personalized learning plan.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <AnalysisLoader
          title="Analysing Your Assessment"
          subtitle="Scoring your responses across 8 career readiness dimensions"
          hints={ASSESSMENT_HINTS}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      )}

      {/* Quiz */}
      {!previewResult && !loading && (
        <div className="card max-w-xl mx-auto animate-fade-in">
          {error && (
            <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-brand-danger text-sm">
              {error}
            </div>
          )}

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-brand-muted mb-2">
              <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
              <span>{Math.round(allAnswered ? 100 : progress)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${allAnswered ? 100 : progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <h2 className="text-lg font-semibold text-white mb-5">
            {question.text}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                  answers[question.id] === opt.value
                    ? 'border-[#0BAAEF] bg-[#0BAAEF]/10 text-white'
                    : 'border-brand-slate bg-brand-dark hover:border-brand-muted text-brand-light'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentQ === 0}
              className="px-4 py-2 text-brand-muted hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[question.id] || loading}
              className="btn-primary flex items-center gap-2"
            >
              {isLastQuestion ? 'Get My Results' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewResult && !fullResult && (() => {
        // Backend returns preview as a plain string — parse it
        const raw: string = typeof previewResult === 'string'
          ? previewResult
          : (previewResult.preview ?? previewResult.summary ?? JSON.stringify(previewResult));

        // Extract score, category, program from the string
        const scoreMatch = raw.match(/Score[:\s]+(\d+)\/100/i);
        const categoryMatch = raw.match(/Category[:\s]+(.+)/i);
        const programMatch = raw.match(/(?:Recommended Program|Program)[:\s]+(.+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
        const category = categoryMatch ? categoryMatch[1].trim() : null;
        const program = programMatch ? programMatch[1].trim() : null;

        const scoreColor = score !== null
          ? score >= 80 ? 'text-[#0BAAEF]' : score >= 60 ? 'text-[#40C4FF]' : score >= 40 ? 'text-yellow-400' : 'text-orange-400'
          : 'text-[#0BAAEF]';

        return (
        <div className="animate-slide-up">
          <div className="card max-w-xl mx-auto mb-6 border border-[#0BAAEF]/20">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#0BAAEF] animate-pulse" />
              <h2 className="text-lg font-bold text-white">Your Assessment Preview</h2>
            </div>

            {score !== null && (
              <div className="flex items-center gap-4 p-4 bg-brand-slate/30 rounded-xl mb-4">
                {/* Circular score */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-slate" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round"
                      className={scoreColor} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-extrabold ${scoreColor}`}>{score}</span>
                  </div>
                </div>
                <div>
                  {category && <p className={`text-xl font-bold ${scoreColor}`}>{category}</p>}
                  <p className="text-brand-muted text-xs mt-0.5">out of 100 points</p>
                </div>
              </div>
            )}

            {program && (
              <div className="flex items-start gap-3 p-3 bg-[#0BAAEF]/10 border border-[#0BAAEF]/20 rounded-lg mb-3">
                <svg className="w-4 h-4 text-[#0BAAEF] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-white/50 text-[10px] uppercase tracking-wide font-semibold mb-0.5">Recommended Program</p>
                  <p className="text-[#0BAAEF] text-sm font-semibold">{program}</p>
                </div>
              </div>
            )}

            <p className="text-brand-muted text-sm">
              Your full report with personalized certification path, timeline, and salary projections is ready.
            </p>
          </div>

          {/* Gated */}
          <div className="relative max-w-xl mx-auto">
            <div className="card opacity-40 blur-sm pointer-events-none select-none">
              <h3 className="text-lg font-bold text-white mb-3">Full Assessment Report</h3>
              <p className="text-brand-muted text-sm">Detailed skill gap analysis...</p>
              <p className="text-brand-muted text-sm">Personalized learning path...</p>
              <p className="text-brand-muted text-sm">Recommended certifications...</p>
              <p className="text-brand-muted text-sm">Career timeline projection...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#0BAAEF]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#0BAAEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-3">Unlock your full assessment report</p>
                <button
                  onClick={() => {
                    track('full_result_unlock_started', { result_name: 'career_assesment_unlock_result' });
                    track('email_submitted', { form_name: 'career_assessment_unlock_result2' });
                    setShowModal(true);
                  }}
                  className="btn-primary animate-pulse-glow"
                >
                  Unlock Full Report
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Full Result */}
      {fullResult && (
        <div className="card max-w-xl mx-auto animate-slide-up">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#0BAAEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-white">Your Full Assessment Report</h2>
            </div>
            <button
              onClick={() => { track('tool_cta_clicked', { cta_name: 'career_assessment_download' }); const r = typeof fullResult === 'string' ? null : fullResult; downloadPdf({ title: 'GRC Career Readiness Assessment', subtitle: 'Governance, Risk & Compliance Career Report', score: (r?.score > 0) ? { value: r.score, label: r?.category || 'GRC Readiness Score' } : null, meta: r?.recommended_program ? [{ label: 'Recommended Program', value: r.recommended_program }] : [], sections: [{ body: r?.detailed_report ?? (typeof fullResult === 'string' ? fullResult : '') }], filename: 'emc-grc-assessment.pdf' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0BAAEF]/30 text-[#0BAAEF] text-xs font-semibold hover:bg-[#0BAAEF]/10 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
          <div className="space-y-4 text-brand-light text-sm leading-relaxed">
            {(() => {
              const r = typeof fullResult === 'string' ? null : fullResult;
              const score = r?.score ?? null;
              const category = r?.category ?? r?.score_category ?? null;
              const program = r?.recommended_program ?? null;
              const report = r?.detailed_report ?? r?.analysis ?? (typeof fullResult === 'string' ? fullResult : null);

              const scoreColor = score !== null
                ? score >= 80 ? 'text-[#0BAAEF]' : score >= 60 ? 'text-[#40C4FF]' : score >= 40 ? 'text-yellow-400' : 'text-orange-400'
                : 'text-[#0BAAEF]';

              return (
                <>
                  {/* Score + category header */}
                  {(score !== null || category) && (
                    <div className="flex items-center gap-4 p-4 bg-brand-slate/30 rounded-xl">
                      {score !== null && (
                        <div className="relative w-16 h-16 shrink-0">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-slate" />
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                              strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round"
                              className={scoreColor} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-extrabold ${scoreColor}`}>{score}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        {category && <p className={`text-xl font-bold ${scoreColor}`}>{category}</p>}
                        {score !== null && <p className="text-brand-muted text-xs">{score}/100 readiness score</p>}
                      </div>
                    </div>
                  )}

                  {/* Recommended program */}
                  {program && (
                    <div className="flex items-start gap-3 p-3 bg-[#0BAAEF]/10 border border-[#0BAAEF]/20 rounded-lg">
                      <svg className="w-4 h-4 text-[#0BAAEF] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-white/50 text-[10px] uppercase tracking-wide font-semibold mb-0.5">Recommended Program</p>
                        <p className="text-[#0BAAEF] text-sm font-semibold">{program}</p>
                      </div>
                    </div>
                  )}

                  {/* Full report text */}
                  {report && (
                    <div className="pt-2">
                      <MarkdownBody text={report} />
                    </div>
                  )}

                  {/* Fallback */}
                  {!report && !score && !category && (
                    <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(fullResult, null, 2)}</pre>
                  )}
                </>
              );
            })()}
          </div>
          <button
            onClick={() => {
              track('tool_cta_clicked', { cta_name: 'career_assessment_retake' });
              resetQuiz();
            }}
            className="btn-secondary w-full mt-6"
          >
            Take Again
          </button>
        </div>
      )}

      <LeadCaptureModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleLeadSubmit}
        resultId={resultId}
        sourceTool="career-assessment"
      />
    </div>
  );
}
