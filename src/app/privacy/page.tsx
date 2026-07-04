import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';
import LegalShell, { Bullets, type LegalSection } from '@/components/LegalShell';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description:
    'How SYNQ collects, uses, stores, and protects data across its lead intelligence, routing, and communication modules.',
  path: '/privacy',
});

const SECTIONS: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    body: (
      <p>
        SYNQ is a lead intelligence platform for finding, enriching, scoring, and routing business leads from
        advertising platforms, website forms, CRM records, imports, and social buying signals. This policy explains how
        we collect, use, disclose, and safeguard information when you use our website, demo workspace, forms, and related
        product experiences.
      </p>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>When you submit a form, request a demo, or use a lead workflow, we may collect:</p>
        <Bullets
          items={[
            'Name, business email, phone number, company, role, and country',
            'Lead source, campaign, UTM, referrer, landing page, and consent preferences',
            'Company attributes, qualification notes, routing status, and enrichment fields',
            'Workspace usage data such as pages visited, actions taken, browser, device, and approximate location',
          ]}
        />
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    body: (
      <>
        <p>We use information to:</p>
        <Bullets
          items={[
            'Provide lead capture, enrichment, scoring, routing, and reporting features',
            'Respond to demo requests, support questions, and product inquiries',
            'Sync or display lead source context from connected ad, CRM, form, and import channels',
            'Improve product quality, security, analytics, and user experience',
            'Comply with legal obligations and enforce acceptable-use requirements',
          ]}
        />
      </>
    ),
  },
  {
    id: 'integrations',
    title: 'Integrations and service providers',
    body: (
      <>
        <p>
          SYNQ may connect with tools such as ad platforms, CRM systems, form tools, analytics providers, enrichment
          services, hosting providers, and messaging systems. We only use these providers to operate the product,
          support requested workflows, and maintain the service.
        </p>
        <p>
          <strong>We do not sell personal information.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights and choices',
    body: (
      <>
        <p>
          Depending on your location, you may have rights to access, correct, delete, restrict, export, or object to
          processing of your personal information. You can also withdraw consent for marketing communications at any
          time.
        </p>
        <p>
          To make a request, contact <a href="mailto:privacy@synq.demo">privacy@synq.demo</a>.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security and retention',
    body: (
      <p>
        We use reasonable technical and organizational safeguards designed to protect information against unauthorized
        access, loss, misuse, or disclosure. We retain information only as long as needed for the purposes described in
        this policy unless a longer period is required by law.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and tracking',
    body: (
      <p>
        We may use cookies or similar technologies to remember preferences, measure product usage, understand campaign
        attribution, and improve the website. You can control cookie settings through your browser.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <div className="glass-card rounded-xl p-5 not-prose">
        <p className="text-on-surface font-bold mb-1">SYNQ Systems Inc.</p>
        <p>
          Email: <a href="mailto:privacy@synq.demo">privacy@synq.demo</a>
        </p>
        <p>
          Website: <a href="/">synq.demo</a>
        </p>
      </div>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="Legal · Privacy"
      title="Privacy Policy"
      updated="June 12, 2026"
      intro="Your trust runs the product. This policy lays out exactly what we collect, why we collect it, and the control you keep over your data."
      sections={SECTIONS}
    />
  );
}
