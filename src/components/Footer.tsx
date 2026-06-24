import Link from 'next/link';

const WORKSPACE = [
  { label: 'Dashboard',    href: '/admin'              },
  { label: 'Signals',      href: '/admin/signals'       },
  { label: 'Leads',        href: '/admin/leads'         },
  { label: 'Outreach',     href: '/admin/outreach'      },
  { label: 'Pipeline',     href: '/admin/pipeline'      },
];

const COMPANY = [
  { label: 'Privacy Policy', href: '/privacy'                       },
  { label: 'Contact',        href: 'mailto:hello@prospectgrid.demo' },
];

const INTEGRATIONS = [
  'Google Ads', 'Meta Ads', 'TikTok Ads', 'HubSpot', 'Salesforce', 'LinkedIn',
];

export default function Footer() {
  return (
    <footer className="bg-[#0B132B] text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Main grid */}
        <div className="mb-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-5 inline-flex items-center gap-3 group">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black tracking-tight text-[#0B132B] group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-200">
                PG
              </span>
              <div>
                <p className="font-bold text-[17px] tracking-tight text-white">ProspectGrid</p>
                <p className="text-xs text-white/40 mt-0.5">Lead intelligence platform</p>
              </div>
            </Link>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/55">
              Find, enrich, score, and route business leads from ad platforms,
              website forms, CRM data, and social buying signals — all in one workspace.
            </p>

            {/* Status pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-2 text-xs font-medium text-[#38BDF8]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#38BDF8]" />
              Live scoring active
            </div>

            {/* Integration tags */}
            <div className="mt-5 flex flex-wrap gap-2">
              {INTEGRATIONS.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-white/40"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Workspace links */}
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
              Workspace
            </p>
            <ul className="space-y-3">
              {WORKSPACE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
              Company
            </p>
            <ul className="space-y-3">
              {COMPANY.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Get started
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200"
              >
                Create workspace
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} ProspectGrid. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <span>·</span>
            <span className="font-medium text-white/50">Powered by ProspectGrid Labs</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
