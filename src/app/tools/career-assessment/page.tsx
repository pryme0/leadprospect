'use client';

import { useState } from 'react';
import { toolsApi } from '@/lib/api';
import LeadCaptureModal, { LeadFormData } from '@/components/LeadCaptureModal';

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
    text: 'What motivates you most to explore cybersecurity?',
    options: [
      { value: 'a', label: 'High salary potential' },
      { value: 'b', label: 'Job security and growing demand' },
      { value: 'c', label: 'Passion for technology and problem-solving' },
      { value: 'd', label: 'I want to protect organizations from cyber threats' },
    ],
  },
  {
    id: 'q3',
    text: 'How soon are you looking to transition into a cybersecurity role?',
    options: [
      { value: 'a', label: 'Immediately — I need a career change now' },
      { value: 'b', label: 'Within the next 3–6 months' },
      { value: 'c', label: 'Within the next year' },
      { value: 'd', label: 'Just exploring for now' },
    ],
  },
  {
    id: 'q4',
    text: 'Do you have any cybersecurity certifications?',
    options: [
      { value: 'a', label: 'None' },
      { value: 'b', label: 'CompTIA Security+ or equivalent' },
      { value: 'c', label: 'CEH, CISSP, or advanced certs' },
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
    text: 'How many hours per week can you dedicate to learning cybersecurity?',
    options: [
      { value: 'a', label: 'Less than 5 hours' },
      { value: 'b', label: '5–10 hours' },
      { value: 'c', label: '10–20 hours' },
      { value: 'd', label: 'More than 20 hours' },
    ],
  },
  {
    id: 'q7',
    text: 'Which area of cybersecurity interests you the most?',
    options: [
      { value: 'a', label: 'Penetration testing and ethical hacking' },
      { value: 'b', label: 'Security operations and incident response' },
      { value: 'c', label: 'Governance, risk, and compliance (GRC)' },
      { value: 'd', label: 'I am not sure yet' },
    ],
  },
  {
    id: 'q8',
    text: 'What is your target annual income in cybersecurity?',
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

  const progress = ((currentQ) / QUESTIONS.length) * 100;
  const question = QUESTIONS[currentQ];
  const isLastQuestion = currentQ === QUESTIONS.length - 1;
  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const handleSelect = (value: string) => {
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
      setCurrentQ(currentQ + 1);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  const handleLeadSubmit = async (data: LeadFormData) => {
    const res = await toolsApi.unlockCareerAssessment(data);
    setFullResult(res.data.full_result);
    setShowModal(false);
  };

  const resetQuiz = () => {
    setCurrentQ(0);
    setAnswers({});
    setPreviewResult(null);
    setFullResult(null);
    setResultId('');
  };

  return (
    <div className="tool-page-container">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full text-brand-cyan text-xs font-medium mb-4">
          8-Question Quiz
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Career Readiness Assessment
        </h1>
        <p className="text-brand-muted max-w-xl mx-auto">
          Answer 8 quick questions to discover your cybersecurity readiness level and
          get a personalized learning plan.
        </p>
      </div>

      {/* Quiz */}
      {!previewResult && (
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
                    ? 'border-brand-accent bg-brand-accent/10 text-white'
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
              {loading ? (
                <>
                  <span className="loading-spinner" />
                  Analyzing...
                </>
              ) : isLastQuestion ? (
                'Get My Results'
              ) : (
                'Next'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewResult && !fullResult && (
        <div className="animate-slide-up">
          <div className="card max-w-xl mx-auto mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Your Assessment Preview</h2>
            <div className="space-y-4">
              {previewResult.score_category && (
                <div className="text-center py-4">
                  <div className="text-4xl font-extrabold gradient-text mb-2">
                    {previewResult.score_category}
                  </div>
                  {previewResult.score && (
                    <div className="text-brand-muted text-sm">Score: {previewResult.score}/100</div>
                  )}
                </div>
              )}
              {previewResult.summary && (
                <p className="text-brand-light text-sm">{previewResult.summary}</p>
              )}
            </div>
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
                <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-3">Unlock your full assessment report</p>
                <button onClick={() => setShowModal(true)} className="btn-primary animate-pulse-glow">
                  Unlock Full Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Result */}
      {fullResult && (
        <div className="card max-w-xl mx-auto animate-slide-up">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-6 h-6 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-white">Your Full Assessment Report</h2>
          </div>
          <div className="space-y-4 text-brand-light text-sm leading-relaxed">
            {typeof fullResult === 'string' ? (
              <div className="whitespace-pre-wrap">{fullResult}</div>
            ) : (
              <>
                {fullResult.score_category && (
                  <div className="text-center py-4 border-b border-brand-slate/50">
                    <div className="text-3xl font-extrabold gradient-text mb-1">{fullResult.score_category}</div>
                    {fullResult.score && <div className="text-brand-muted text-sm">Score: {fullResult.score}/100</div>}
                  </div>
                )}
                {fullResult.analysis && <div className="whitespace-pre-wrap">{fullResult.analysis}</div>}
                {fullResult.skill_gaps && (
                  <div>
                    <h3 className="text-brand-accent font-semibold mb-2">Skill Gaps</h3>
                    <div className="whitespace-pre-wrap">{fullResult.skill_gaps}</div>
                  </div>
                )}
                {fullResult.learning_path && (
                  <div>
                    <h3 className="text-brand-accent font-semibold mb-2">Learning Path</h3>
                    <div className="whitespace-pre-wrap">{fullResult.learning_path}</div>
                  </div>
                )}
                {fullResult.recommendations && (
                  <div>
                    <h3 className="text-brand-accent font-semibold mb-2">Recommendations</h3>
                    <div className="whitespace-pre-wrap">{fullResult.recommendations}</div>
                  </div>
                )}
                {!fullResult.analysis && !fullResult.skill_gaps && !fullResult.learning_path && (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(fullResult, null, 2)}</pre>
                )}
              </>
            )}
          </div>
          <button onClick={resetQuiz} className="btn-secondary w-full mt-6">
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
