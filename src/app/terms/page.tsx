import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/config';
import LegalShell, { Bullets, type LegalSection } from '@/components/LegalShell';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description:
    'The terms that govern your use of SYNQ — accounts, acceptable use, subscriptions, data ownership, warranties, and liability.',
  path: '/terms',
});

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to terms',
    body: (
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the SYNQ website, demo workspace,
        applications, and related services (collectively, the &ldquo;Service&rdquo;) provided by SYNQ Systems Inc.
        (&ldquo;SYNQ,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By creating a workspace, accessing, or using the
        Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts and eligibility',
    body: (
      <>
        <p>
          You must be at least 18 years old and able to form a binding contract to use the Service. When you create a
          workspace you agree to:
        </p>
        <Bullets
          items={[
            'Provide accurate, current, and complete information',
            'Keep your login credentials confidential and secure',
            'Be responsible for all activity that happens under your account',
            'Notify us promptly of any unauthorized use or security breach',
          ]}
        />
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to use the Service to:</p>
        <Bullets
          items={[
            'Violate any law, regulation, or third-party right, including data-protection and anti-spam laws',
            'Upload or process data you do not have the right to use, or send outreach without a lawful basis',
            'Reverse engineer, scrape, or disrupt the Service, or attempt to bypass usage limits and security controls',
            'Send malware, conduct phishing, or transmit unlawful, deceptive, or harmful content',
            'Resell or provide the Service to third parties except as expressly permitted',
          ]}
        />
      </>
    ),
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions and billing',
    body: (
      <>
        <p>
          Paid plans are billed in advance on a recurring basis (monthly or annually) according to the plan you select.
          Unless stated otherwise:
        </p>
        <Bullets
          items={[
            'Subscriptions renew automatically until cancelled',
            'You can cancel at any time; access continues through the end of the current billing period',
            'Fees are non-refundable except where required by law',
            'We may change pricing with reasonable advance notice, effective on your next renewal',
          ]}
        />
      </>
    ),
  },
  {
    id: 'data-ownership',
    title: 'Your data',
    body: (
      <>
        <p>
          You retain all rights to the data you submit to the Service (&ldquo;Customer Data&rdquo;). You grant SYNQ a
          limited license to host, process, and display Customer Data solely to operate and improve the Service and to
          provide the features you request.
        </p>
        <p>
          Our handling of personal information is described in our <a href="/privacy">Privacy Policy</a>, which is
          incorporated into these Terms. You are responsible for ensuring you have the necessary rights and consents for
          the data you process through the Service.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual property',
    body: (
      <p>
        The Service, including its software, models, design, and content (excluding Customer Data), is owned by SYNQ and
        protected by intellectual-property laws. These Terms do not grant you any right to our trademarks, logos, or
        branding without prior written permission.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    body: (
      <p>
        We work to keep the Service available and reliable, but we may modify, suspend, or discontinue features at any
        time. We may also update these Terms; when we make material changes, we will provide reasonable notice. Continued
        use after changes take effect constitutes acceptance of the revised Terms.
      </p>
    ),
  },
  {
    id: 'warranty',
    title: 'Disclaimers',
    body: (
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
        whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement.
        SYNQ does not warrant that the Service will be uninterrupted, error-free, or that lead scoring and enrichment
        results will meet a specific outcome.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the maximum extent permitted by law, SYNQ will not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill. Our total liability for
        any claim arising out of or relating to the Service will not exceed the amounts you paid to us in the twelve (12)
        months preceding the claim.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    body: (
      <p>
        You may stop using the Service at any time. We may suspend or terminate your access if you breach these Terms or
        use the Service in a way that risks harm to us, other users, or third parties. Upon termination, your right to
        use the Service ends, and we may delete Customer Data after a reasonable retention period.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the laws of the jurisdiction in which SYNQ Systems Inc. is established, without
        regard to conflict-of-law principles. Any disputes will be resolved in the courts of that jurisdiction, unless
        applicable law requires otherwise.
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
          Email: <a href="mailto:legal@synq.demo">legal@synq.demo</a>
        </p>
        <p>
          Website: <a href="/">synq.demo</a>
        </p>
      </div>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalShell
      eyebrow="Legal · Terms"
      title="Terms of Service"
      updated="June 12, 2026"
      intro="These terms cover the rules of the road for using SYNQ — your account, acceptable use, billing, data ownership, and the limits of our liability."
      sections={SECTIONS}
    />
  );
}
