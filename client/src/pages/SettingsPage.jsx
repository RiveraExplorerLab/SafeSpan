import { useState, useEffect } from 'react';
import { fetchSettings, updateSettings, fetchAccounts, updateAccount } from '../services/api';
import { formatCurrency } from '../utils/format';

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
];

export default function SettingsPage({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Settings
  const [payFrequency, setPayFrequency] = useState('biweekly');
  const [payAnchorDate, setPayAnchorDate] = useState('');
  const [netPayAmount, setNetPayAmount] = useState('');
  const [semimonthlyDay1, setSemimonthlyDay1] = useState('1');
  const [semimonthlyDay2, setSemimonthlyDay2] = useState('15');

  // Account
  const [account, setAccount] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [settingsData, accountsData] = await Promise.all([
        fetchSettings(),
        fetchAccounts(),
      ]);

      // Settings
      setPayFrequency(settingsData.payFrequency);
      setPayAnchorDate(settingsData.payAnchorDate);
      setNetPayAmount(settingsData.netPayAmount.toString());
      if (settingsData.semimonthlyDays) {
        setSemimonthlyDay1(settingsData.semimonthlyDays[0].toString());
        setSemimonthlyDay2(settingsData.semimonthlyDays[1].toString());
      }

      // Account (first one)
      if (accountsData.length > 0) {
        const acc = accountsData[0];
        setAccount(acc);
        setAccountName(acc.name);
        setAccountBalance(acc.currentBalance.toString());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const settings = {
        payFrequency,
        payAnchorDate,
        netPayAmount: parseFloat(netPayAmount),
      };

      if (payFrequency === 'semimonthly') {
        settings.semimonthlyDays = [
          parseInt(semimonthlyDay1, 10),
          parseInt(semimonthlyDay2, 10),
        ];
      }

      await updateSettings(settings);
      setSuccess('Pay schedule updated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await updateAccount(account.id, {
        name: accountName,
        currentBalance: parseFloat(accountBalance),
      });
      setSuccess('Account updated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-4">Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Account Section */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          
          <form onSubmit={handleSaveAccount}>
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
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="accountBalance" className="label">
                Current Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  id="accountBalance"
                  className="input pl-7"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  step="0.01"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use this to correct your balance if it gets out of sync
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Account'}
            </button>
          </form>
        </div>

        {/* Pay Schedule Section */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pay Schedule</h2>
          
          <form onSubmit={handleSaveSettings}>
            <div className="mb-4">
              <label htmlFor="payFrequency" className="label">
                Pay Frequency
              </label>
              <select
                id="payFrequency"
                className="input"
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value)}
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
                <label className="label">Pay Days</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    className="input w-20"
                    value={semimonthlyDay1}
                    onChange={(e) => setSemimonthlyDay1(e.target.value)}
                    min="1"
                    max="31"
                    required
                  />
                  <span className="text-gray-400">and</span>
                  <input
                    type="number"
                    className="input w-20"
                    value={semimonthlyDay2}
                    onChange={(e) => setSemimonthlyDay2(e.target.value)}
                    min="1"
                    max="31"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="payAnchorDate" className="label">
                Reference Pay Date
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
                Any recent or upcoming pay date to anchor calculations
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="netPayAmount" className="label">
                Net Pay Amount
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
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Take-home pay per paycheck
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Pay Schedule'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
