import Link from 'next/link';

const TOOLS = [
  { label: 'Cyber Path Finder', href: '/tools/cyber-path-finder' },
  { label: 'Career Assessment', href: '/tools/career-assessment' },
  { label: 'Resume Analyzer', href: '/tools/resume-analyzer' },
];

const LEGAL = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Contact', href: 'mailto:contact@excelmindcyber.com' },
];

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-white/5 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #050a14 0%, #030810 100%)' }}>

      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(11,170,239,0.3), rgba(64,196,255,0.15), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* Main grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
              <img src="/emclogo.png" alt="EMC Logo" className="w-10 h-10 object-contain shrink-0" />
              <div>
                <p className="text-white font-bold text-base leading-tight">ExcelMindCyber</p>
                <p className="text-white/30 text-xs leading-tight">A Thelix Holdings Company</p>
              </div>
            </Link>
            <p className="text-white/35 text-sm leading-relaxed max-w-xs mb-5">
              Free, AI-powered career tools to help anyone break into cybersecurity — regardless of background or location.
            </p>
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs"
              style={{ background: 'rgba(11,170,239,0.06)', borderColor: 'rgba(11,170,239,0.2)', color: 'rgba(11,170,239,0.8)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0BAAEF] animate-pulse" />
              All systems operational
            </div>
          </div>

          {/* Tools column */}
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Tools</p>
            <ul className="space-y-2.5">
              {TOOLS.map((t) => (
                <li key={t.href}>
                  <Link href={t.href}
                    className="text-white/40 hover:text-[#0BAAEF] text-sm transition-colors">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">Company</p>
            <ul className="space-y-2.5">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <a href={l.href}
                    className="text-white/40 hover:text-[#0BAAEF] text-sm transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">
            &copy; {new Date().getFullYear()} ExcelMindCyber. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-white/15 text-xs">
            <span>Powered by</span>
            <span className="text-white/30 font-semibold">Thelix Holdings</span>
            <span className="w-4 h-4 bg-gradient-to-br from-[#0BAAEF] to-[#40C4FF] rounded flex items-center justify-center text-[#050b12] font-black text-[8px]">
              TH
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
