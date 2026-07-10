import Link from 'next/link';

const PRODUCT = [
  { label: 'Hub',          href: '/hub'          },
  { label: 'Features',     href: '/features'     },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Pricing',      href: '/pricing'      },
  { label: 'Testimonials', href: '/testimonials' },
];

const COMPANY = [
  { label: 'About',   href: '/about'   },
  { label: 'Careers', href: '/contact' },
  { label: 'Contact', href: '/contact' },
];

const SUPPORT = [
  { label: 'Help centre', href: '/' },
  { label: 'Security',    href: '/' },
  { label: 'Status',      href: '/' },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms',   href: '/terms'   },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-glass-stroke bg-midnight">
      <div className="mx-auto grid max-w-container-max grid-cols-2 gap-gutter px-margin-mobile py-stack-lg md:grid-cols-4 md:px-margin-desktop lg:grid-cols-5">

        {/* Brand */}
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="mb-4 flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/synq-logo.png" alt="SYNQ" className="h-9 w-8 object-cover object-left" />
            <span className="font-display-lg text-display-lg font-bold text-on-surface">SYNQ</span>
          </Link>
          <p className="max-w-xs font-body-md text-body-md text-on-surface-variant">
            Helping businesses get found online and win more customers. Simple, honest, built for Africa.
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="mb-6 font-bold text-on-surface">Product</h4>
          <ul className="space-y-4">
            {PRODUCT.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-on-surface-variant transition-colors hover:text-secondary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="mb-6 font-bold text-on-surface">Company</h4>
          <ul className="space-y-4">
            {COMPANY.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-on-surface-variant transition-colors hover:text-secondary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="mb-6 font-bold text-on-surface">Support</h4>
          <ul className="space-y-4">
            {SUPPORT.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-on-surface-variant transition-colors hover:text-secondary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1">
          <h4 className="mb-6 font-bold text-on-surface">Legal</h4>
          <ul className="space-y-4">
            {LEGAL.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-on-surface-variant transition-colors hover:text-secondary hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-4 border-t border-glass-stroke px-margin-mobile py-8 md:flex-row md:px-margin-desktop">
        <div className="font-body-md text-body-md text-on-surface-variant">
          &copy; {new Date().getFullYear()} SYNQ. All rights reserved.
        </div>
        <div className="flex gap-6 text-on-surface-variant">
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">public</span>
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">hub</span>
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">monitoring</span>
        </div>
      </div>
    </footer>
  );
}
