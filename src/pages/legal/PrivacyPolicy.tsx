import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-800/50 backdrop-blur rounded-lg p-8 border border-cyan-500/20">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          
          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Introduction</h2>
            <p>NeonLights.cam ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-pink-400 mb-2">A. Information You Provide Directly</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Registration:</strong> Name, email, date of birth, username, password, phone number</li>
              <li><strong>Identity & Age Verification:</strong> Government-issued ID, proof of age (for creators and users)</li>
              <li><strong>Payment Information:</strong> Cryptocurrency wallet address and transaction history (processed by NOWPayments, never stored on our servers)</li>
              <li><strong>Profile Information:</strong> Bio, profile photo, streaming schedule, content tags, streaming preferences</li>
              <li><strong>Communications:</strong> Messages, support tickets, feedback, complaints</li>
              <li><strong>Creator Information:</strong> Paxum payout email, tax ID (for payouts)</li>
            </ul>

            <h3 className="text-xl font-semibold text-pink-400 mb-2 mt-4">B. Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Device Information:</strong> IP address, browser type, device type, operating system</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, streams watched, searches performed, clicks</li>
              <li><strong>Location Data:</strong> Approximate location (IP-based, not real-time tracking)</li>
              <li><strong>Cookies & Tracking:</strong> Session cookies, analytics cookies, performance monitoring</li>
              <li><strong>Streaming Data:</strong> Stream duration, viewer count, engagement metrics</li>
            </ul>

            <h3 className="text-xl font-semibold text-pink-400 mb-2 mt-4">C. Information from Third Parties</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Payment processors (NOWPayments, Paxum): Transaction data, fraud flags</li>
              <li>Verification services: Age verification results, identity confirmation</li>
              <li>Analytics providers (Vercel, Supabase logs): Usage patterns, performance metrics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Verify age (18+ requirement) and identity</li>
              <li>Process payments and payouts securely</li>
              <li>Provide and improve Platform services</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Enforce Terms of Service and legal obligations</li>
              <li>Send platform updates, notifications, and promotional content (opt-out available)</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Respond to legal requests and law enforcement inquiries</li>
              <li>Comply with tax, financial, and regulatory obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Data Sharing & Disclosure</h2>
            <p>We do NOT sell your personal data. We may share information with:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Service Providers:</strong> NOWPayments (payments), Paxum (creator payouts), Supabase (hosting), Vercel (CDN), Mux (streaming)</li>
              <li><strong>Legal Obligations:</strong> Law enforcement, courts, regulators (with warrant or court order)</li>
              <li><strong>Business Transfers:</strong> In event of acquisition or bankruptcy, data may be transferred</li>
              <li><strong>Fraud Prevention:</strong> Payment processors and fraud detection services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Data:</strong> Retained while account is active, deleted 90 days after account closure</li>
              <li><strong>Payment Records:</strong> Retained for 7 years (tax/legal compliance)</li>
              <li><strong>Streaming Content:</strong> Retained per creator's settings (can be deleted anytime)</li>
              <li><strong>Logs & Analytics:</strong> Retained for 90 days for security/debugging</li>
              <li><strong>Identity Verification:</strong> Securely deleted after verification complete (retain copy for 1 year per legal requirement)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Your Privacy Rights</h2>
            <p><strong>You have the right to:</strong></p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
              <li><strong>Correction:</strong> Request corrections to inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (right to be forgotten)</li>
              <li><strong>Portability:</strong> Receive your data in portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails anytime</li>
              <li><strong>Do Not Track:</strong> Browser DNT signals are respected</li>
            </ul>
            <p className="mt-4">To exercise these rights, contact: <span className="text-pink-400 font-semibold">privacy@neonlights.cam</span></p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. GDPR Compliance (EU Residents)</h2>
            <p>For EU residents, we comply with GDPR requirements:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Legal basis for processing: Contractual necessity, legitimate interest, legal compliance</li>
              <li>Data Protection Officer contact: dpo@neonlights.cam</li>
              <li>Right to lodge complaints with your national data protection authority</li>
              <li>Data transfer agreements in place for non-EU processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. CCPA Compliance (California Residents)</h2>
            <p>California residents have specific rights:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information collected</li>
              <li>Right to opt-out of data sales (we do not sell data)</li>
              <li>Right to non-discrimination for exercising CCPA rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Children's Privacy</h2>
            <p><strong>STRICT ZERO-TOLERANCE POLICY:</strong></p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Platform is NOT intended for anyone under 18</li>
              <li>Age verification is MANDATORY at signup</li>
              <li>Any suspected child content is immediately removed and reported to authorities</li>
              <li>We comply with COPPA (Children's Online Privacy Protection Act)</li>
              <li>Report child exploitation: report@neonlights.cam</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. Data Security</h2>
            <p>We implement industry-standard security measures:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>SSL/TLS encryption for all data in transit</li>
              <li>AES-256 encryption for sensitive data at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>PCI DSS compliance for payment processing</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Limited access to sensitive data (principle of least privilege)</li>
              <li>Incident response plan in place</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400"><strong>Note:</strong> No system is 100% secure. Unauthorized access attempts are monitored.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Cookies & Tracking Technologies</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Session Cookies:</strong> Maintain login state (deleted on logout)</li>
              <li><strong>Analytics Cookies:</strong> Track usage patterns for improvement</li>
              <li><strong>Performance Cookies:</strong> Monitor site performance</li>
              <li>You can disable cookies in browser settings (may impact functionality)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">12. Third-Party Links & Services</h2>
            <p>Our Platform may link to third-party services (NOWPayments, Paxum, Mux, etc.). We are not responsible for their privacy practices. Review their privacy policies separately.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">13. International Data Transfers</h2>
            <p>Your data may be processed and stored in the United States and other countries. By using NeonLights, you consent to such transfers. We comply with international data protection laws.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">14. Data Breach Notification</h2>
            <p>In event of a data breach affecting personal information, we will:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Notify affected users within 72 hours</li>
              <li>Provide details of the breach and steps taken</li>
              <li>Offer credit monitoring services if applicable</li>
              <li>Report to relevant authorities as required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">15. Changes to Privacy Policy</h2>
            <p>We may update this Privacy Policy periodically. Major changes will be communicated via email. Continued use constitutes acceptance of updates.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">16. Contact Us</h2>
            <p>For privacy concerns or requests:</p>
            <p className="text-pink-400 font-semibold mt-2">
              privacy@neonlights.cam<br/>
              support@neonlights.cam<br/>
              Data Protection Officer: dpo@neonlights.cam
            </p>
          </section>

          <section>
            <p className="text-sm text-gray-400 mt-8">Last Updated: July 2026</p>
            <p className="text-sm text-gray-400">© 2026 NeonLights.cam. All rights reserved.</p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
