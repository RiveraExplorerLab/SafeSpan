import { useState } from 'react';
import { createAccount } from '../services/api';
import { updateSettings } from '../services/api';

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
];

export default function SetupPage({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Account data
  const [accountName, setAccountName] = useState('Primary Checking');
  const [currentBalance, setCurrentBalance] = useState('');

  // Pay schedule data
  const [payFrequency, setPayFrequency] = useState('biweekly');
  const [payAnchorDate, setPayAnchorDate] = useState('');
  const [netPayAmount, setNetPayAmount] = useState('');
  const [semimonthlyDay1, setSemimonthlyDay1] = useState('1');
  const [semimonthlyDay2, setSemimonthlyDay2] = useState('15');

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create the account first
      const account = await createAccount({
        name: accountName,
        type: 'checking',
        currentBalance: parseFloat(currentBalance),
      });

      // Then create settings
      const settings = {
        payFrequency,
        payAnchorDate,
        netPayAmount: parseFloat(netPayAmount),
        primaryAccountId: account.id,
      };

      if (payFrequency === 'semimonthly') {
        settings.semimonthlyDays = [
          parseInt(semimonthlyDay1, 10),
          parseInt(semimonthlyDay2, 10),
        ];
      }

      await updateSettings(settings);

      // Wait for Firestore to propagate the data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Done — trigger refresh
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">SafeSpan</h1>
          <p className="text-gray-600 mt-2">Let's get you set up</p>
        </div>

        <div className="card">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-gray-300'}`} />
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary-500' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-gray-300'}`} />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Submit}>
              <h2 className="text-lg font-semibold mb-4">Your Account</h2>

              <div className="mb-4">
                <label htmlFor="accountName" className="label">
                  Account Name
                </label>
                <input
                  type="text"
                  id="accountName"
                  className="input"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Primary Checking"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="currentBalance" className="label">
                  Current Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    id="currentBalance"
                    className="input pl-7"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your current checking account balance
                </p>
              </div>

              <button type="submit" className="btn-primary w-full">
                Continue
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Submit}>
              <h2 className="text-lg font-semibold mb-4">Pay Schedule</h2>

              <div className="mb-4">
                <label htmlFor="payFrequency" className="label">
                  How often do you get paid?
                </label>
                <select
                  id="payFrequency"
                  className="input"
                  value={payFrequency}
                  onChange={(e) => setPayFrequency(e.target.value)}
                  required
                >
                  {PAY_FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              {payFrequency === 'semimonthly' && (
                <div className="mb-4">
                  <label className="label">Which days of the month?</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      className="input"
                      value={semimonthlyDay1}
                      onChange={(e) => setSemimonthlyDay1(e.target.value)}
                      min="1"
                      max="31"
                      placeholder="1"
                      required
                    />
                    <span className="self-center text-gray-400">and</span>
                    <input
                      type="number"
                      className="input"
                      value={semimonthlyDay2}
                      onChange={(e) => setSemimonthlyDay2(e.target.value)}
                      min="1"
                      max="31"
                      placeholder="15"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="payAnchorDate" className="label">
                  {payFrequency === 'semimonthly'
                    ? 'A recent pay date'
                    : 'Your last (or next) pay date'}
                </label>
                <input
                  type="date"
                  id="payAnchorDate"
                  className="input"
                  value={payAnchorDate}
                  onChange={(e) => setPayAnchorDate(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to calculate your pay periods
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="netPayAmount" className="label">
                  Net pay per paycheck
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    id="netPayAmount"
                    className="input pl-7"
                    value={netPayAmount}
                    onChange={(e) => setNetPayAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Take-home pay after taxes and deductions
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Finish Setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
