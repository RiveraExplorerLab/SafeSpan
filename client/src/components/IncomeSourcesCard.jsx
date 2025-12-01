import { useState } from 'react';
import { createIncomeSource, updateIncomeSource, deleteIncomeSource, addPaycheck } from '../services/api';
import { useConfirm } from './ConfirmDialog';

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
];

export default function IncomeSourcesCard({ sources = [], accounts = [], onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirm = useConfirm();

  // Form state
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('biweekly');
  const [anchorDate, setAnchorDate] = useState('');
  const [semimonthlyDay1, setSemimonthlyDay1] = useState('1');
  const [semimonthlyDay2, setSemimonthlyDay2] = useState('15');
  const [autoAdd, setAutoAdd] = useState(true);
  const [deposits, setDeposits] = useState([{ accountId: '', amount: '' }]);

  const resetForm = () => {
    setName('');
    setFrequency('biweekly');
    setAnchorDate('');
    setSemimonthlyDay1('1');
    setSemimonthlyDay2('15');
    setAutoAdd(true);
    setDeposits([{ accountId: accounts[0]?.id || '', amount: '' }]);
    setEditingSource(null);
    setError('');
  };

  const openForm = (source = null) => {
    if (source) {
      setEditingSource(source);
      setName(source.name);
      setFrequency(source.frequency);
      setAnchorDate(source.anchorDate || '');
      setAutoAdd(source.autoAdd);
      setDeposits(source.deposits.map(d => ({ 
        accountId: d.accountId, 
        amount: d.amount.toString() 
      })));
      if (source.semimonthlyDays) {
        setSemimonthlyDay1(source.semimonthlyDays[0].toString());
        setSemimonthlyDay2(source.semimonthlyDays[1].toString());
      }
    } else {
      resetForm();
    }
    setShowForm(true);
    document.body.style.overflow = 'hidden';
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    document.body.style.overflow = '';
  };

  const addDeposit = () => {
    setDeposits([...deposits, { accountId: accounts[0]?.id || '', amount: '' }]);
  };

  const removeDeposit = (index) => {
    if (deposits.length > 1) {
      setDeposits(deposits.filter((_, i) => i !== index));
    }
  };

  const updateDeposit = (index, field, value) => {
    const newDeposits = [...deposits];
    newDeposits[index][field] = value;
    setDeposits(newDeposits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const depositData = deposits
        .filter(d => d.accountId && d.amount)
        .map(d => ({
          accountId: d.accountId,
          amount: parseFloat(d.amount),
        }));

      if (depositData.length === 0) {
        throw new Error('At least one deposit with account and amount is required');
      }

      const sourceData = {
        name,
        frequency,
        anchorDate,
        autoAdd,
        deposits: depositData,
        expectedAmount: depositData.reduce((sum, d) => sum + d.amount, 0),
      };

      if (frequency === 'semimonthly') {
        sourceData.semimonthlyDays = [
          parseInt(semimonthlyDay1, 10),
          parseInt(semimonthlyDay2, 10),
        ];
      }

      if (editingSource) {
        await updateIncomeSource(editingSource.id, sourceData);
      } else {
        await createIncomeSource(sourceData);
      }

      closeForm();
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (source) => {
    const confirmed = await confirm({
      title: 'Delete Income Source',
      message: `Are you sure you want to delete "${source.name}"? This won't delete any existing transactions.`,
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteIncomeSource(source.id);
        onUpdate?.();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleToggleActive = async (source) => {
    try {
      await updateIncomeSource(source.id, { isActive: !source.isActive });
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddPaycheck = async (source) => {
    const confirmed = await confirm({
      title: 'Add Paycheck',
      message: `Add paycheck from "${source.name}" with the default amounts to your accounts?`,
      confirmText: 'Add Paycheck',
      variant: 'info',
    });

    if (confirmed) {
      try {
        await addPaycheck(source.id);
        onUpdate?.();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const bankAccounts = accounts.filter(a => a.type !== 'credit_card');
  const totalExpected = deposits
    .filter(d => d.amount)
    .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Income Sources</h2>
        <button onClick={() => openForm()} className="btn-primary text-sm">
          + Add Income
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {sources.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">
          No income sources yet. Add your first one!
        </p>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`border rounded-lg p-4 ${
                source.isActive !== false
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-100 dark:border-gray-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{source.name}</h3>
                    {!source.autoAdd && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                        Manual
                      </span>
                    )}
                    {source.isActive === false && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded">
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ${source.expectedAmount?.toLocaleString()} · {FREQUENCIES.find(f => f.value === source.frequency)?.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Next: {source.nextPayDate}
                  </p>
                  {source.deposits?.length > 1 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Split: {source.deposits.map(d => {
                        const acc = accounts.find(a => a.id === d.accountId);
                        return `${acc?.name || 'Unknown'} ($${d.amount})`;
                      }).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!source.autoAdd && source.isActive !== false && (
                    <button
                      onClick={() => handleAddPaycheck(source)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      Add Paycheck
                    </button>
                  )}
                  <button
                    onClick={() => openForm(source)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(source)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {source.isActive !== false ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60]">
          <div 
            className="bg-white dark:bg-gray-800 rounded-t-xl md:rounded-xl shadow-xl w-full md:max-w-md flex flex-col"
            style={{ maxHeight: 'calc(100vh - 60px)' }}
          >
            {/* Handle bar for mobile */}
            <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-6 pt-2 md:pt-6 pb-2 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingSource ? 'Edit Income Source' : 'Add Income Source'}
              </h3>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} id="income-source-form">
                <div className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full-time Job, Freelance, etc."
                    required
                  />
                </div>

                <div>
                  <label className="label">Pay Frequency</label>
                  <select
                    className="input"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {frequency === 'semimonthly' && (
                  <div>
                    <label className="label">Pay Days of Month</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        className="input"
                        value={semimonthlyDay1}
                        onChange={(e) => setSemimonthlyDay1(e.target.value)}
                        min="1"
                        max="31"
                      />
                      <span className="self-center text-gray-400">and</span>
                      <input
                        type="number"
                        className="input"
                        value={semimonthlyDay2}
                        onChange={(e) => setSemimonthlyDay2(e.target.value)}
                        min="1"
                        max="31"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">
                    {frequency === 'semimonthly' ? 'A Recent Pay Date' : 'Last or Next Pay Date'}
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoAdd}
                      onChange={(e) => setAutoAdd(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Auto-add paycheck on pay day</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {autoAdd
                      ? 'Transactions will be created automatically on each pay day'
                      : 'You\'ll manually add each paycheck (for variable income)'}
                  </p>
                </div>

                <div>
                  <label className="label">Deposits</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Split your paycheck across multiple accounts
                  </p>
                  
                  {deposits.map((deposit, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select
                        className="input flex-1"
                        value={deposit.accountId}
                        onChange={(e) => updateDeposit(index, 'accountId', e.target.value)}
                        required
                      >
                        <option value="">Select account</option>
                        {bankAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          className="input pl-7"
                          value={deposit.amount}
                          onChange={(e) => updateDeposit(index, 'amount', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          required
                        />
                      </div>
                      {deposits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDeposit(index)}
                          className="text-red-500 hover:text-red-600 px-2"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addDeposit}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add another account
                  </button>

                  {totalExpected > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Total: <span className="font-medium">${totalExpected.toLocaleString()}</span>
                    </p>
                  )}
                </div>
                </div>
              </form>
            </div>

            {/* Fixed footer with buttons */}
            <div 
              className="flex-shrink-0 px-6 pt-3 pb-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700"
              style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 80px))' }}
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="income-source-form"
                  className="btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingSource ? 'Save Changes' : 'Add Income'}
                </button>
              </div>

              {editingSource && (
                <button
                  type="button"
                  onClick={() => {
                    closeForm();
                    handleDelete(editingSource);
                  }}
                  className="w-full mt-3 text-sm text-red-600 hover:text-red-700"
                >
                  Delete Income Source
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
