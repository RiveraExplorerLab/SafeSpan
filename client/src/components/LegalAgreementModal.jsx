import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LegalAgreementModal({ onAgree, loading }) {
  const [tosChecked, setTosChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  const canAgree = tosChecked && privacyChecked;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-8 text-center">
          <img src="/logo.svg" alt="SafeSpan" className="w-16 h-16 mx-auto mb-4 rounded-xl" />
          <h2 className="text-2xl font-bold text-white">Welcome to SafeSpan</h2>
          <p className="text-primary-100 mt-2 text-sm">Before you get started, please review our terms</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
            To use SafeSpan, you must agree to our Terms of Service and Privacy Policy. These documents explain how the app works and how we handle your data.
          </p>

          {/* Checkboxes */}
          <div className="space-y-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={tosChecked}
                onChange={(e) => setTosChecked(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I have read and agree to the{' '}
                <Link 
                  to="/terms" 
                  target="_blank" 
                  className="text-primary-600 hover:underline font-medium"
                >
                  Terms of Service
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={privacyChecked}
                onChange={(e) => setPrivacyChecked(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I have read and agree to the{' '}
                <Link 
                  to="/privacy" 
                  target="_blank" 
                  className="text-primary-600 hover:underline font-medium"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {/* Info box */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 mb-6">
            <p className="text-xs text-primary-700 dark:text-primary-300">
              <strong>Your data is yours.</strong> We don't sell or share your financial information. You can delete your account and data at any time.
            </p>
          </div>

          {/* Button */}
          <button
            onClick={onAgree}
            disabled={!canAgree || loading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
              canAgree && !loading
                ? 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/30'
                : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Please wait...
              </span>
            ) : (
              'I Agree — Continue to SafeSpan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
