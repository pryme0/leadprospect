import Link from 'next/link';

const TOOLS = [
  { label: 'Dashboard',  href: '/admin'          },
  { label: 'Signals',    href: '/admin/signals'   },
  { label: 'Leads',      href: '/admin/leads'     },
  { label: 'Outreach',   href: '/admin/outreach'  },
];

const LEGAL = [
  { label: 'Privacy Policy', href: '/privacy'                       },
  { label: 'Contact',        href: 'mailto:hello@prospectgrid.demo' },
];

export default function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[#d4e7ee] bg-[#112126] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">

        {/* Main grid */}
        <div className="mb-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 inline-flex items-center gap-3 group">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white text-sm font-black tracking-tight text-[#112126]">
                PG
              </span>
              <div>
                <p className="font-bold text-base leading-tight text-white">ProspectGrid</p>
                <p className="text-xs leading-tight text-white/40">Lead intelligence platform</p>
              </div>
            </Link>
            <p className="mb-5 max-w-xs text-sm leading-relaxed text-white/60">
              Find, enrich, score, and route business leads from ad platforms,
              websites, CRM data, and social buying signals.
            </p>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
              style={{ background: 'rgba(0,206,200,0.10)', borderColor: 'rgba(0,206,200,0.22)', color: '#FCEFC3' }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00CEC8]" />
              Running on local demo data
            </div>
          </div>

          {/* Tools column */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Workspace</p>
            <ul className="space-y-2.5">
              {TOOLS.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="text-sm text-white/60 transition-colors hover:text-[#FCEFC3]">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Company</p>
            <ul className="space-y-2.5">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-white/60 transition-colors hover:text-[#FCEFC3]">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} ProspectGrid. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <span>Powered by</span>
            <span className="font-semibold text-white/70">ProspectGrid Labs</span>
            <span className="flex h-4 w-4 items-center justify-center rounded border border-white/15 bg-white text-[8px] font-black text-[#112126]">
              PG
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
