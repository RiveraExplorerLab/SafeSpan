export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Last updated: December 1, 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Overview</h2>
            <p>SafeSpan is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Information We Collect</h2>
            <p><strong>Account Information:</strong></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Email address (for authentication)</li>
              <li>Display name (optional)</li>
            </ul>
            
            <p className="mt-4"><strong>Financial Data You Provide:</strong></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Account names and balances</li>
              <li>Transaction descriptions and amounts</li>
              <li>Bill names, amounts, and due dates</li>
              <li>Income sources and pay schedules</li>
              <li>Category budgets</li>
            </ul>

            <p className="mt-4"><strong>Technical Data:</strong></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Device type and browser information</li>
              <li>Usage patterns within the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">What We Do NOT Collect</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Bank account numbers or routing numbers</li>
              <li>Credit card numbers</li>
              <li>Social Security numbers</li>
              <li>Login credentials to your financial institutions</li>
            </ul>
            <p className="mt-2">SafeSpan does not connect to your bank accounts. All financial data is manually entered by you.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">How We Use Your Information</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>To provide the budgeting and tracking features of SafeSpan</li>
              <li>To calculate your safe-to-spend amount</li>
              <li>To send transactional emails (password resets, important updates)</li>
              <li>To improve the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Data Storage & Security</h2>
            <p>Your data is stored securely using Google Firebase infrastructure, which provides:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest</li>
              <li>Secure authentication via Firebase Auth</li>
              <li>Access controls limiting data to your account only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Data Sharing</h2>
            <p><strong>We do not sell, rent, or share your personal financial data with third parties.</strong></p>
            <p className="mt-2">We may share data only in these limited circumstances:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>With service providers necessary to operate the app (Firebase/Google Cloud), under strict data protection agreements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Access</strong> your data at any time within the app</li>
              <li><strong>Correct</strong> any inaccurate information</li>
              <li><strong>Delete</strong> your account and all associated data</li>
              <li><strong>Export</strong> your data (contact us for assistance)</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, we will delete your data within 30 days, except where we are required to retain it for legal purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Cookies</h2>
            <p>SafeSpan uses essential cookies and local storage for authentication and app functionality. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Contact</h2>
            <p>For privacy-related questions or to exercise your data rights, contact us at <a href="mailto:pablo@pablorivera.dev" className="text-primary-600 hover:underline">pablo@pablorivera.dev</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a href="/" className="text-primary-600 hover:text-primary-700 font-medium">← Back to SafeSpan</a>
        </div>
      </div>
    </div>
  );
}
