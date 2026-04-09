'use client';

import { useState, useRef, useCallback } from 'react';
import { toolsApi } from '@/lib/api';
import LeadCaptureModal, { LeadFormData } from '@/components/LeadCaptureModal';

export default function ResumeAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [fullResult, setFullResult] = useState<any>(null);
  const [resultId, setResultId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
    const res = await toolsApi.unlockResumeAnalysis(data);
    setFullResult(res.data.full_result);
    setShowModal(false);
  };

  const reset = () => {
    setFile(null);
    setPreviewResult(null);
    setFullResult(null);
    setResultId('');
    setError('');
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
          Upload your resume and get AI-powered feedback to optimize it for
          cybersecurity roles. PDF only, max 5MB.
        </p>
      </div>

      {/* Upload area */}
      {!previewResult && (
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
                ? 'border-brand-accent bg-brand-accent/5'
                : file
                ? 'border-brand-accent/50 bg-brand-accent/5'
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
                <svg className="w-10 h-10 text-brand-accent mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {loading ? (
                <>
                  <span className="loading-spinner" />
                  Analyzing Resume...
                </>
              ) : (
                'Analyze My Resume'
              )}
            </button>
          )}
        </div>
      )}

      {/* Preview */}
      {previewResult && !fullResult && (
        <div className="animate-slide-up">
          <div className="card max-w-xl mx-auto mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Resume Analysis Preview</h2>
            <p className="text-brand-muted text-sm mb-4">
              Here are 2 key improvements we found:
            </p>
            <div className="space-y-3">
              {(previewResult.improvements || []).map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-brand-light text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-accent/20 text-brand-accent rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
              {previewResult.overall_score && (
                <div className="pt-3 border-t border-brand-slate/50">
                  <span className="text-brand-muted text-sm">Overall Score: </span>
                  <span className="text-white font-bold">{previewResult.overall_score}/100</span>
                </div>
              )}
            </div>
          </div>

          {/* Gated */}
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
                <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Full Result */}
      {fullResult && (
        <div className="card max-w-xl mx-auto animate-slide-up">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-6 h-6 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-white">Complete Resume Analysis</h2>
          </div>
          <div className="space-y-4 text-brand-light text-sm leading-relaxed">
            {typeof fullResult === 'string' ? (
              <div className="whitespace-pre-wrap">{fullResult}</div>
            ) : (
              <>
                {fullResult.overall_score && (
                  <div className="text-center py-4 border-b border-brand-slate/50">
                    <div className="text-3xl font-extrabold gradient-text">{fullResult.overall_score}/100</div>
                    <div className="text-brand-muted text-sm">Resume Score</div>
                  </div>
                )}
                {fullResult.improvements && (
                  <div>
                    <h3 className="text-brand-accent font-semibold mb-2">Improvements</h3>
                    {fullResult.improvements.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 mb-2">
                        <span className="text-brand-accent">&#8226;</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
                {fullResult.keywords && (
                  <div>
                    <h3 className="text-brand-accent font-semibold mb-2">Keyword Suggestions</h3>
                    <div className="whitespace-pre-wrap">{typeof fullResult.keywords === 'string' ? fullResult.keywords : JSON.stringify(fullResult.keywords, null, 2)}</div>
                  </div>
                )}
                {fullResult.analysis && (
                  <div>
                    <h3 className="text-brand-accent font-semibold mb-2">Detailed Analysis</h3>
                    <div className="whitespace-pre-wrap">{fullResult.analysis}</div>
                  </div>
                )}
                {!fullResult.improvements && !fullResult.analysis && (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(fullResult, null, 2)}</pre>
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
      />
    </div>
  );
}
