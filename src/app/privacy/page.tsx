export default function PrivacyPolicyPage() {
  return (
    <div className="page-container max-w-4xl mx-auto py-16">
      <h1 className="text-3xl font-extrabold text-white mb-2">Privacy Policy</h1>
      <p className="text-brand-muted mb-10">Last updated: April 8, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-brand-light leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
          <p>
            ExcelMindCyber, a brand operated by Thelix Holdings (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
            is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our website and tools, including the Cyber Path Finder,
            Career Assessment, and Resume Analyzer (collectively, the &ldquo;Services&rdquo;).
          </p>
          <p>
            By using our Services, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
          <h3 className="text-lg font-semibold text-white mb-2">Personal Information</h3>
          <p>When you use our lead capture forms, we may collect:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>First name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Country of residence</li>
            <li>Current job title or role</li>
            <li>Income range</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-4 mb-2">Tool Usage Data</h3>
          <p>When you use our career tools, we collect:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Career preferences and goals you input</li>
            <li>Assessment quiz responses</li>
            <li>Uploaded resume content (for analysis purposes only)</li>
            <li>Tool interaction data and results</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-4 mb-2">Automatically Collected Information</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>IP address and approximate location</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Pages visited and time spent</li>
            <li>Referring website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide and personalize our career tools and services</li>
            <li>Send you cybersecurity career resources, tips, and opportunities via email and/or SMS</li>
            <li>Improve and optimize our Services</li>
            <li>Analyze usage patterns and tool effectiveness</li>
            <li>Respond to your inquiries and provide support</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">4. Legal Basis for Processing (GDPR)</h2>
          <p>If you are in the European Economic Area (EEA), we process your personal data based on:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Consent:</strong> When you explicitly consent to receive communications by checking our consent box</li>
            <li><strong>Legitimate Interest:</strong> To improve our Services and provide relevant career resources</li>
            <li><strong>Contractual Necessity:</strong> To deliver the tool results you have requested</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">5. Your Rights Under GDPR</h2>
          <p>If you are an EEA resident, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate personal data</li>
            <li><strong>Erasure:</strong> Request deletion of your personal data (&ldquo;right to be forgotten&rdquo;)</li>
            <li><strong>Restriction:</strong> Request restriction of processing your personal data</li>
            <li><strong>Data Portability:</strong> Request transfer of your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Withdraw Consent:</strong> Withdraw your consent at any time</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@excelmindcyber.com" className="text-[#0BAAEF] hover:underline">
              privacy@excelmindcyber.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. Your Rights Under CCPA</h2>
          <p>If you are a California resident, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Know:</strong> Request disclosure of categories and specific pieces of personal information collected</li>
            <li><strong>Delete:</strong> Request deletion of personal information we have collected</li>
            <li><strong>Opt-Out:</strong> Opt out of the sale of personal information (we do not sell your data)</li>
            <li><strong>Non-Discrimination:</strong> Not receive discriminatory treatment for exercising your rights</li>
          </ul>
          <p className="mt-2">
            To submit a CCPA request, email{' '}
            <a href="mailto:privacy@excelmindcyber.com" className="text-[#0BAAEF] hover:underline">
              privacy@excelmindcyber.com
            </a>{' '}
            or call us at the number listed below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">7. Data Sharing and Disclosure</h2>
          <p>We may share your information with:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our Services (hosting, analytics, email delivery)</li>
            <li><strong>Legal Compliance:</strong> When required by law, regulation, or legal process</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
          <p className="mt-2">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">8. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information, including
            encryption in transit and at rest, access controls, and regular security assessments. However,
            no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">9. Data Retention</h2>
          <p>
            We retain your personal data only as long as necessary to fulfill the purposes outlined in this policy,
            unless a longer retention period is required by law. You may request deletion of your data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">10. Cookies and Tracking</h2>
          <p>
            We may use cookies and similar tracking technologies to enhance your experience and collect usage data.
            You can control cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">11. Children&apos;s Privacy</h2>
          <p>
            Our Services are not directed to individuals under the age of 16. We do not knowingly collect
            personal information from children. If we become aware that we have collected data from a child,
            we will take steps to delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes
            by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">13. Contact Information</h2>
          <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
          <div className="mt-3 p-4 bg-brand-slate/30 rounded-lg space-y-1">
            <p><strong>ExcelMindCyber</strong> (a Thelix Holdings company)</p>
            <p>
              Email:{' '}
              <a href="mailto:privacy@excelmindcyber.com" className="text-[#0BAAEF] hover:underline">
                privacy@excelmindcyber.com
              </a>
            </p>
            <p>
              Website:{' '}
              <a href="https://excelmindcyber.com" className="text-[#0BAAEF] hover:underline">
                excelmindcyber.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
