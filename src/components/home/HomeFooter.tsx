import Link from 'next/link';
import WordmarkDivider from './WordmarkDivider';

const PRODUCT = [
  { label: 'Hub', href: '/hub' },
  { label: 'Features', href: '/features' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Pricing', href: '/pricing' },
];

const COMPANY = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Testimonials', href: '/testimonials' },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export default function HomeFooter() {
  return (
    <footer className="border-t border-glass-stroke bg-surface-bright pt-16">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-2 gap-10 pb-14 md:grid-cols-4">
          <div className="col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/synq-logo.png" alt="SYNQ" className="h-8 w-7 object-cover object-left" />
              <span className="font-headline-md text-xl font-extrabold text-on-background">SYNQ</span>
            </Link>
            <p className="max-w-xs font-body-md text-sm text-on-surface-variant">
              Helping businesses get found online and win more customers. Simple, honest, built for Africa.
            </p>
          </div>
          <FooterCol title="Product" links={PRODUCT} />
          <FooterCol title="Company" links={COMPANY} />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-glass-stroke py-8 md:flex-row">
          <p className="font-mono-label text-mono-label text-outline">&copy; {new Date().getFullYear()} SYNQ. All rights reserved.</p>
          <div className="flex gap-6">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="font-mono-label text-mono-label text-outline transition-colors hover:text-primary">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <WordmarkDivider />
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="mb-5 font-mono-label text-mono-label uppercase text-outline">{title}</h4>
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="font-body-md text-sm text-on-surface-variant transition-colors hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
