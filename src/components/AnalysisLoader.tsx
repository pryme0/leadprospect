'use client';

import { useEffect, useState } from 'react';

interface AnalysisLoaderProps {
  hints: string[];
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function AnalysisLoader({ hints, title, subtitle, icon }: AnalysisLoaderProps) {
  const [hintIdx, setHintIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [dots, setDots] = useState(0);
  const [progress, setProgress] = useState(8);

  // Cycle hints with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setHintIdx((i) => (i + 1) % hints.length);
        setFade(true);
      }, 300);
    }, 3200);
    return () => clearInterval(interval);
  }, [hints.length]);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, []);

  // Fake progress bar — crawls toward 90% then stalls
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 88) return p;
        const step = p < 40 ? 4 : p < 70 ? 2 : 0.6;
        return Math.min(88, p + step + Math.random() * step);
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card max-w-xl mx-auto animate-fade-in">
      {/* Icon + spinner */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-16 h-16 mb-4">
          {/* Outer ring spin */}
          <svg className="absolute inset-0 w-16 h-16 animate-spin" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2"
              strokeDasharray="30 146" strokeLinecap="round" className="text-[#00CEC8]" />
          </svg>
          {/* Inner ring counter-spin */}
          <svg className="absolute inset-0 w-16 h-16" style={{ animation: 'spin 2s linear infinite reverse' }}
            viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray="15 110" strokeLinecap="round" className="text-[#FCEFC3]/60" />
          </svg>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center text-[#00CEC8]">
            {icon ?? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          </div>
        </div>

        <h3 className="text-white font-bold text-lg">{title}</h3>
        {subtitle && <p className="text-brand-muted text-sm mt-1">{subtitle}</p>}
        <p className="text-brand-muted text-sm mt-1">
          Analysing{'.'.repeat(dots + 1)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-brand-muted mb-1.5">
          <span>Processing</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-brand-slate rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00CEC8] to-[#FCEFC3] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Rotating hint */}
      <div className="min-h-[56px] flex items-start gap-3 p-3.5 bg-brand-slate/30 rounded-xl border border-brand-slate/40">
        <div className="w-5 h-5 rounded-full bg-[#00CEC8]/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-[#00CEC8]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <p
          className="text-brand-light/80 text-sm leading-relaxed transition-opacity duration-300"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {hints[hintIdx]}
        </p>
      </div>

      {/* Step pipeline */}
      <div className="flex items-center gap-0 mt-5 px-1">
        {['Input', 'AI Analysis', 'Scoring', 'Report'].map((step, i) => {
          const pct = progress;
          const thresholds = [0, 30, 65, 88];
          const active = pct >= thresholds[i];
          const current = active && (i === 3 ? pct < 100 : pct < thresholds[i + 1]);
          return (
            <div key={step} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {i < 3 && (
                <div className="absolute top-2.5 left-1/2 w-full h-0.5 bg-brand-slate">
                  <div
                    className="h-full bg-[#00CEC8] transition-all duration-700"
                    style={{ width: pct >= thresholds[i + 1] ? '100%' : current ? '50%' : '0%' }}
                  />
                </div>
              )}
              {/* Dot */}
              <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                active && !current
                  ? 'bg-[#00CEC8] border-[#00CEC8]'
                  : current
                  ? 'bg-brand-darker border-[#00CEC8] animate-pulse'
                  : 'bg-brand-darker border-brand-slate'
              }`}>
                {active && !current && (
                  <svg className="w-2.5 h-2.5 text-brand-darker" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium ${active ? 'text-[#00CEC8]' : 'text-brand-muted'}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
