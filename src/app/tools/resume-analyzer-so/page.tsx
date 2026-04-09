'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toolsApi } from '@/lib/api';
import LeadCaptureModal, { LeadFormData } from '@/components/LeadCaptureModal';
import { downloadPdf } from '@/lib/downloadPdf';
import AnalysisLoader from '@/components/AnalysisLoader';

const RESUME_HINTS = [
  'Scanning your resume for GRC, audit, risk & compliance keywords…',
  'Identifying skill gaps against entry-level GRC Analyst & IT Auditor postings…',
  'Assessing your existing certifications (Security+, CRISC, CISA, ISO 27001)…',
  'Benchmarking your profile against Risk, Audit & Compliance job requirements…',
  'Mapping your experience to NIST, ISO 27001, SOC 2, HIPAA & SOX frameworks…',
  'Evaluating ATS compatibility for GRC job applications…',
  'Comparing your background to successful EMC GRC program graduates…',
  'Generating your personalised GRC improvement action plan…',
];

const LS_KEY = 'emc_resume_analyzer_so';

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[#0BAAEF]/80">$1</em>');
}

function ReportBody({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim() && l.trim() !== '---');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (/^#\s+/.test(trimmed) && !/^##/.test(trimmed))
          return <h1 key={i} className="text-white font-bold text-lg mt-6 mb-2 first:mt-0 border-b border-brand-slate/40 pb-1.5">{trimmed.replace(/^#\s+/, '')}</h1>;
        if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed))
          return <h2 key={i} className="text-white font-semibold text-base mt-5 mb-2 first:mt-0">{trimmed.replace(/^##\s+/, '')}</h2>;
        if (/^###\s+/.test(trimmed))
          return <p key={i} className="text-[#0BAAEF] font-semibold text-xs uppercase tracking-wide mt-4 mb-1">{trimmed.replace(/^###\s+/, '')}</p>;
        if (/^\s{2,}[-*]/.test(line))
          return <div key={i} className="flex items-start gap-2 pl-5"><span className="text-[#0BAAEF]/50 mt-1.5 shrink-0 text-[10px]">◦</span><span className="text-brand-light/80 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^[-*]\s*/, '')) }} /></div>;
        if (/^[-*]\s/.test(trimmed))
          return <div key={i} className="flex items-start gap-2"><span className="text-[#0BAAEF] mt-1.5 shrink-0 text-xs">▸</span><span className="text-brand-light text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^[-*]\s+/, '')) }} /></div>;
        if (/^\d+\.\s/.test(trimmed)) {
          const m = trimmed.match(/^(\d+)\.\s+(.+)/);
          if (m) return <div key={i} className="flex items-start gap-3"><span className="text-[#0BAAEF] font-bold text-xs mt-1 shrink-0 w-4 text-right">{m[1]}.</span><span className="text-brand-light text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(m[2]) }} /></div>;
        }
        if (trimmed) return <p key={i} className="text-brand-light/80 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />;
        return null;
      })}
    </div>
  );
}

export default function ResumeAnalyzerSoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [fullResult, setFullResult] = useState<any>(null);
  const [resultId, setResultId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { previewResult: p, fullResult: f, resultId: r } = JSON.parse(saved);
        if (p) setPreviewResult(p);
        if (f) setFullResult(f);
        if (r) setResultId(r);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (previewResult || fullResult) {
      localStorage.setItem(LS_KEY, JSON.stringify({ previewResult, fullResult, resultId }));
    }
  }, [previewResult, fullResult, resultId]);

  const MAX_SIZE = 5 * 1024 * 1024;

  const validateFile = (f: File): string | null => {
    if (f.type !== 'application/pdf') return 'Only PDF files are accepted.';
    if (f.size > MAX_SIZE) return 'File must be under 5MB.';
    return null;
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await toolsApi.submitResumeAnalysis(file);
      setPreviewResult(res.data.preview);
      setResultId(res.data.result_id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (data: LeadFormData) => {
    try {
      const res = await toolsApi.unlockResumeAnalysis(data);
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

  const reset = () => {
    setFile(null);
    setPreviewResult(null);
    setFullResult(null);
    setResultId('');
    setError('');
    localStorage.removeItem(LS_KEY);
  };

  return (
    <div className="tool-page-container">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-medium mb-4">
          AI Powered
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Resume Analyzer
        </h1>
        <p className="text-brand-muted max-w-xl mx-auto">
          Upload your resume and get AI-powered feedback to optimize it for GRC
          (Governance, Risk & Compliance) roles. PDF only, max 5MB.
        </p>
      </div>

      {loading && (
        <AnalysisLoader
          title="Analysing Your Resume"
          subtitle={file ? `Processing ${file.name}` : 'Running AI gap analysis'}
          hints={RESUME_HINTS}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      )}

      {!previewResult && !loading && (
        <div className="card max-w-xl mx-auto">
          {error && (
            <div className="mb-4 p-3 bg-brand-danger/10 border border-brand-danger/30 rounded-lg text-brand-danger text-sm">
              {error}
            </div>
          )}

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-[#0BAAEF] bg-[#0BAAEF]/5'
                : file
                ? 'border-[#0BAAEF]/50 bg-[#0BAAEF]/5'
                : 'border-brand-slate hover:border-brand-muted'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />

            {file ? (
              <div className="space-y-2">
                <svg className="w-10 h-10 text-[#0BAAEF] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-brand-muted text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-brand-danger text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <svg className="w-12 h-12 text-brand-muted mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-white font-medium">
                  Drag & drop your resume here
                </p>
                <p className="text-brand-muted text-sm">
                  or click to browse. PDF only, max 5MB.
                </p>
              </div>
            )}
          </div>

          {file && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {loading ? 'Starting Analysis…' : 'Analyse My Resume'}
            </button>
          )}
        </div>
      )}

      {previewResult && !fullResult && (
        <div className="animate-slide-up">
          <div className="card max-w-xl mx-auto mb-6 border border-[#0BAAEF]/20">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#0BAAEF] animate-pulse" />
              <h2 className="text-lg font-bold text-white">Resume Analysis Preview</h2>
            </div>

            {previewResult.overall_score != null && previewResult.overall_score > 0 && (
              <div className="flex items-center gap-4 p-3 bg-brand-slate/30 rounded-xl mb-4">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-slate" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${previewResult.overall_score} ${100 - previewResult.overall_score}`}
                      strokeLinecap="round" className="text-[#0BAAEF]" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-extrabold text-[#0BAAEF]">{previewResult.overall_score}</span>
                  </div>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Cybersecurity Readiness</p>
                  <p className="text-brand-muted text-xs">{previewResult.overall_score}/100</p>
                </div>
              </div>
            )}

            <p className="text-brand-muted text-xs uppercase tracking-wide font-semibold mb-3">
              2 Key Improvements Identified
            </p>
            <div className="space-y-3">
              {(previewResult.improvements || []).length > 0 ? (
                (previewResult.improvements as string[]).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#0BAAEF]/20 text-[#0BAAEF] rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-brand-light text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
                  </div>
                ))
              ) : (
                <p className="text-brand-muted text-sm italic">Improvements are part of your full report.</p>
              )}
            </div>

            <p className="text-brand-muted text-sm mt-4">
              Unlock the full analysis to see all 5 improvements, certification recommendations, and a personalised action plan.
            </p>
          </div>

          <div className="relative max-w-xl mx-auto">
            <div className="card opacity-40 blur-sm pointer-events-none select-none">
              <h3 className="text-lg font-bold text-white mb-3">Full Resume Analysis</h3>
              <p className="text-brand-muted text-sm">Complete list of improvements...</p>
              <p className="text-brand-muted text-sm">Keyword optimization suggestions...</p>
              <p className="text-brand-muted text-sm">ATS compatibility score...</p>
              <p className="text-brand-muted text-sm">Cybersecurity role matching...</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#0BAAEF]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#0BAAEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-3">Unlock your full resume analysis</p>
                <button onClick={() => setShowModal(true)} className="btn-primary animate-pulse-glow">
                  Unlock Full Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullResult && (
        <div className="card max-w-xl mx-auto animate-slide-up">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#0BAAEF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-white">Complete Resume Analysis</h2>
            </div>
            <button
              onClick={() => downloadPdf({ title: 'Resume Gap Analysis', subtitle: 'GRC Career Transition Report', score: (fullResult?.overall_score > 0) ? { value: fullResult.overall_score, label: 'GRC Readiness Score' } : null, sections: [{ body: typeof fullResult === 'string' ? fullResult : (fullResult?.analysis || '') }], filename: 'emc-grc-resume-analysis.pdf' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0BAAEF]/30 text-[#0BAAEF] text-xs font-semibold hover:bg-[#0BAAEF]/10 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
          <div className="space-y-4 text-brand-light text-sm leading-relaxed">
            {typeof fullResult === 'string' ? (
              <div className="whitespace-pre-wrap">{fullResult}</div>
            ) : (
              <>
                {fullResult.overall_score != null && fullResult.overall_score > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-brand-slate/30 rounded-xl">
                    <div className="relative w-16 h-16 shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-slate" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                          strokeDasharray={`${fullResult.overall_score} ${100 - fullResult.overall_score}`}
                          strokeLinecap="round" className="text-[#0BAAEF]" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-extrabold text-[#0BAAEF]">{fullResult.overall_score}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{fullResult.overall_score}/100</p>
                      <p className="text-brand-muted text-xs">Cybersecurity Readiness Score</p>
                    </div>
                  </div>
                )}
                {fullResult.improvements && (
                  <div>
                    <h3 className="text-[#0BAAEF] font-semibold mb-2">Improvements</h3>
                    {fullResult.improvements.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 mb-2">
                        <span className="text-[#0BAAEF]">&#8226;</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
                {fullResult.analysis && (
                  <div className="pt-1">
                    <ReportBody text={fullResult.analysis} />
                  </div>
                )}
                {!fullResult.analysis && (
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(fullResult, null, 2)}</pre>
                )}
              </>
            )}
          </div>
          <button onClick={reset} className="btn-secondary w-full mt-6">
            Analyze Another Resume
          </button>
        </div>
      )}

      <LeadCaptureModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleLeadSubmit}
        resultId={resultId}
        sourceTool="resume-analyzer"
        leadSource="social"
      />
    </div>
  );
}
