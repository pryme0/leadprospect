export default function PrivacyPolicyPage() {
  return (
    <div className="page-container mx-auto max-w-4xl py-16">
      <h1 className="mb-2 text-3xl font-extrabold text-white">Privacy Policy</h1>
      <p className="mb-10 text-brand-muted">Last updated: June 12, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-brand-light leading-relaxed">
        <section>
          <h2 className="mb-3 text-xl font-bold text-white">1. Introduction</h2>
          <p>
            ProspectGrid is a lead intelligence platform for finding, enriching, scoring, and routing business
            leads from advertising platforms, website forms, CRM records, imports, and social buying signals.
            This policy explains how we collect, use, disclose, and safeguard information when you use our website,
            demo workspace, forms, and related product experiences.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-white">2. Information We Collect</h2>
          <p>When you submit a form, request a demo, or use a lead workflow, we may collect:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>Name, business email, phone number, company, role, and country</li>
            <li>Lead source, campaign, UTM, referrer, landing page, and consent preferences</li>
            <li>Company attributes, qualification notes, routing status, and enrichment fields</li>
            <li>Workspace usage data such as pages visited, actions taken, browser, device, and approximate location</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-white">3. How We Use Information</h2>
          <p>We use information to:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>Provide lead capture, enrichment, scoring, routing, and reporting features</li>
            <li>Respond to demo requests, support questions, and product inquiries</li>
            <li>Sync or display lead source context from connected ad, CRM, form, and import channels</li>
            <li>Improve product quality, security, analytics, and user experience</li>
            <li>Comply with legal obligations and enforce acceptable-use requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-white">4. Integrations and Service Providers</h2>
          <p>
            ProspectGrid may connect with tools such as ad platforms, CRM systems, form tools, analytics providers,
            enrichment services, hosting providers, and messaging systems. We only use these providers to operate
            the product, support requested workflows, and maintain the service.
          </p>
          <p className="mt-2">We do not sell personal information.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-white">5. Your Rights and Choices</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, restrict, export, or object
            to processing of your personal information. You can also withdraw consent for marketing communications
            at any time.
          </p>
          <p className="mt-2">
            To make a request, contact{' '}
            <a href="mailto:privacy@prospectgrid.demo" className="text-[#00CEC8] hover:underline">
              privacy@prospectgrid.demo
            </a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-white">6. Security and Retention</h2>
          <p>
            We use reasonable technical and organizational safeguards designed to protect information against
            unauthorized access, loss, misuse, or disclosure. We retain information only as long as needed for the
            purposes described in this policy unless a longer period is required by law.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-white">7. Cookies and Tracking</h2>
          <p>
            We may use cookies or similar technologies to remember preferences, measure product usage, understand
            campaign attribution, and improve the website. You can control cookie settings through your browser.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold text-white">8. Contact</h2>
          <div className="mt-3 rounded-lg bg-brand-slate/30 p-4">
            <p>
              <strong>ProspectGrid</strong>
            </p>
            <p>
              Email:{' '}
              <a href="mailto:privacy@prospectgrid.demo" className="text-[#00CEC8] hover:underline">
                privacy@prospectgrid.demo
              </a>
            </p>
            <p>
              Website:{' '}
              <a href="/" className="text-[#00CEC8] hover:underline">
                prospectgrid.demo
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
