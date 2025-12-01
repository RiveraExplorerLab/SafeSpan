export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Last updated: December 1, 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using SafeSpan ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">2. Description of Service</h2>
            <p>SafeSpan is a personal budgeting application that helps users track their spending, bills, and calculate their safe-to-spend amount between paychecks. The Service is provided on an invite-only basis.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">3. User Accounts</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate information when using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">4. User Data</h2>
            <p>You retain ownership of all financial data you enter into SafeSpan. We do not sell, share, or distribute your personal financial information to third parties. Your data is stored securely using Firebase/Google Cloud infrastructure.</p>
            <p className="mt-2">You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">5. Not Financial Advice</h2>
            <p><strong>SafeSpan is a budgeting tool, not a financial advisor.</strong> The Service provides calculations and tracking features to help you manage your personal finances, but does not constitute professional financial, investment, tax, or legal advice. You should consult qualified professionals for financial decisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">6. Accuracy of Information</h2>
            <p>SafeSpan relies on information you provide. We do not connect to your bank accounts or verify the accuracy of entered data. You are responsible for ensuring the information you enter is accurate and up-to-date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">7. Service Availability</h2>
            <p>We strive to maintain reliable service but do not guarantee uninterrupted access. The Service may be temporarily unavailable for maintenance, updates, or circumstances beyond our control. We are not liable for any losses resulting from service interruptions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">8. Limitation of Liability</h2>
            <p>SafeSpan is provided "as is" without warranties of any kind. To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data or use.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">9. Termination</h2>
            <p>We reserve the right to suspend or terminate your access to the Service at any time, with or without cause. You may stop using the Service at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of significant changes via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">11. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:pablo@pablorivera.dev" className="text-primary-600 hover:underline">pablo@pablorivera.dev</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a href="/" className="text-primary-600 hover:text-primary-700 font-medium">← Back to SafeSpan</a>
        </div>
      </div>
    </div>
  );
}
