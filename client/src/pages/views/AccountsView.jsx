import { useState, useEffect } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import { CATEGORIES } from '../../utils/categories';
import IncomeSourcesCard from '../../components/IncomeSourcesCard';

export default function AccountsView() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [accountFormData, setAccountFormData] = useState({ name: '', type: 'checking', currentBalance: '', creditLimit: '', apr: '', dueDay: '' });
  const [accountFormLoading, setAccountFormLoading] = useState(false);

  // Recurring transactions state
  const [recurring, setRecurring] = useState([]);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [recurringFormOpen, setRecurringFormOpen] = useState(false);
  const [recurringFormData, setRecurringFormData] = useState({ description: '', amount: '', type: 'debit_purchase', frequency: 'monthly', startDate: '', accountId: '' });
  const [recurringFormLoading, setRecurringFormLoading] = useState(false);

  // Budget state
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [budgetFormLoading, setBudgetFormLoading] = useState(false);

  // Income sources state
  const [incomeSources, setIncomeSources] = useState([]);

  const ACCOUNT_TYPES = [
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings' },
    { value: 'credit_card', label: 'Credit Card' },
  ];

  const RECURRING_FREQUENCIES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const RECURRING_TYPES = [
    { value: 'income', label: 'Income' },
    { value: 'debit_purchase', label: 'Expense' },
  ];

  // Budgetable categories (exclude income)
  const BUDGET_CATEGORIES = CATEGORIES.filter(c => c.value !== 'income');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { fetchSettings, fetchAccounts, fetchRecurring, fetchIncomeSources } = await import('../../services/api');
      const [settingsData, accountsData, recurringData, incomeSourcesData] = await Promise.all([
        fetchSettings(), 
        fetchAccounts(), 
        fetchRecurring(true).catch(() => []),
        fetchIncomeSources(true).catch(() => [])
      ]);
      setCategoryBudgets(settingsData.categoryBudgets || {});
      setAccounts(accountsData);
      setRecurring(recurringData);
      setIncomeSources(incomeSourcesData);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleSaveBudgets = async (e) => {
    e.preventDefault();
    setBudgetFormLoading(true);
    try {
      const { updateSettings } = await import('../../services/api');
      // Clean up: remove zero or empty values
      const cleanBudgets = {};
      Object.entries(categoryBudgets).forEach(([cat, val]) => {
        const num = parseFloat(val);
        if (num > 0) cleanBudgets[cat] = num;
      });
      await updateSettings({ categoryBudgets: cleanBudgets });
      setCategoryBudgets(cleanBudgets);
      setBudgetFormOpen(false);
      setSuccess('Budgets saved!');
    } catch (err) { setError(err.message); }
    finally { setBudgetFormLoading(false); }
  };

  // Account handlers
  const openAddAccount = () => {
    setEditingAccount(null);
    setAccountFormData({ name: '', type: 'checking', currentBalance: '', creditLimit: '', apr: '', dueDay: '' });
    setAccountFormOpen(true);
  };

  const openEditAccount = (account) => {
    setEditingAccount(account);
    setAccountFormData({ 
      name: account.name, 
      type: account.type, 
      currentBalance: account.currentBalance.toString(),
      creditLimit: account.creditLimit?.toString() || '',
      apr: account.apr?.toString() || '',
      dueDay: account.dueDay?.toString() || ''
    });
    setAccountFormOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountFormLoading(true);
    try {
      const { createAccount, updateAccount } = await import('../../services/api');
      const payload = { 
        name: accountFormData.name, 
        currentBalance: parseFloat(accountFormData.currentBalance) 
      };
      
      if (accountFormData.type === 'credit_card' || editingAccount?.type === 'credit_card') {
        if (accountFormData.creditLimit) payload.creditLimit = parseFloat(accountFormData.creditLimit);
        if (accountFormData.apr) payload.apr = parseFloat(accountFormData.apr);
        if (accountFormData.dueDay) payload.dueDay = parseInt(accountFormData.dueDay, 10);
      }
      
      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
      } else {
        payload.type = accountFormData.type;
        await createAccount(payload);
      }
      setAccountFormOpen(false);
      setSuccess(editingAccount ? 'Account updated!' : 'Account added!');
      loadData();
    } catch (err) { setError(err.message); } 
    finally { setAccountFormLoading(false); }
  };

  const handleDeleteAccount = async (account) => {
    const confirmed = await confirm({
      title: 'Delete Account',
      message: `Delete "${account.name}"? This cannot be undone. Transactions will remain but won't be linked to this account.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      const { deleteAccount } = await import('../../services/api');
      await deleteAccount(account.id);
      setSuccess('Account deleted!');
      loadData();
    } catch (err) { setError(err.message); }
  };

  // Recurring handlers
  const openAddRecurring = () => {
    setEditingRecurring(null);
    const today = new Date().toISOString().split('T')[0];
    setRecurringFormData({ description: '', amount: '', type: 'debit_purchase', frequency: 'monthly', startDate: today, accountId: accounts[0]?.id || '' });
    setRecurringFormOpen(true);
  };

  const openEditRecurring = (rec) => {
    setEditingRecurring(rec);
    setRecurringFormData({
      description: rec.description,
      amount: rec.amount.toString(),
      type: rec.type,
      frequency: rec.frequency,
      startDate: rec.nextDueDate,
      accountId: rec.accountId || ''
    });
    setRecurringFormOpen(true);
  };

  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    setRecurringFormLoading(true);
    try {
      const { createRecurring, updateRecurring } = await import('../../services/api');
      const payload = {
        description: recurringFormData.description,
        amount: parseFloat(recurringFormData.amount),
        type: recurringFormData.type,
        frequency: recurringFormData.frequency,
        accountId: recurringFormData.accountId || null,
      };

      if (editingRecurring) {
        await updateRecurring(editingRecurring.id, payload);
      } else {
        payload.startDate = recurringFormData.startDate;
        await createRecurring(payload);
      }
      setRecurringFormOpen(false);
      setSuccess(editingRecurring ? 'Recurring updated!' : 'Recurring added!');
      loadData();
    } catch (err) { setError(err.message); }
    finally { setRecurringFormLoading(false); }
  };

  const handleDeleteRecurring = async (rec) => {
    const confirmed = await confirm({
      title: 'Delete Recurring',
      message: `Delete "${rec.description}"? This won't affect existing transactions.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      const { deleteRecurring } = await import('../../services/api');
      await deleteRecurring(rec.id);
      setSuccess('Recurring deleted!');
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleToggleRecurring = async (rec) => {
    try {
      const { updateRecurring } = await import('../../services/api');
      await updateRecurring(rec.id, { isActive: !rec.isActive });
      loadData();
    } catch (err) { setError(err.message); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const formatDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const getFrequencyLabel = (freq) => RECURRING_FREQUENCIES.find(f => f.value === freq)?.label || freq;

  const budgetCount = Object.values(categoryBudgets).filter(v => v > 0).length;

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
        <div className="card animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-4"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
      
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm animate-fadeIn">{error}</div>}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm animate-fadeIn flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* Accounts Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold dark:text-white">Accounts</h3>
          <button onClick={openAddAccount} className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add Account</button>
        </div>
        <div className="space-y-3">
          {accounts.map((account) => {
            const typeColor = account.type === 'checking' ? 'bg-primary-500' : account.type === 'savings' ? 'bg-blue-500' : 'bg-purple-500';
            const typeLabel = account.type === 'credit_card' ? 'Credit Card' : account.type;
            const utilization = account.type === 'credit_card' && account.creditLimit ? Math.round((account.currentBalance / account.creditLimit) * 100) : null;
            
            return (
              <div key={account.id} className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${typeColor}`} />
                    <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                    <span className="text-xs text-gray-400 capitalize">({typeLabel})</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-medium ${account.type === 'credit_card' ? 'text-purple-600' : 'text-gray-900 dark:text-white'}`}>
                      {account.type === 'credit_card' && account.currentBalance > 0 ? '-' : ''}{formatCurrency(Math.abs(account.currentBalance))}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <button onClick={() => openEditAccount(account)} className="text-primary-600 hover:text-primary-700">Edit</button>
                      {accounts.length > 1 && <button onClick={() => handleDeleteAccount(account)} className="text-red-500 hover:text-red-700">Delete</button>}
                    </div>
                  </div>
                </div>
                {account.type === 'credit_card' && account.creditLimit && (
                  <div className="mt-2 ml-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Available: {formatCurrency(account.creditLimit - account.currentBalance)}</span>
                      <span>{utilization}% used</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${utilization > 75 ? 'bg-red-500' : utilization > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Income Sources Section */}
      <IncomeSourcesCard sources={incomeSources} accounts={accounts} onUpdate={loadData} />

      {/* Budget Limits Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold dark:text-white">Category Budgets</h3>
          <button onClick={() => setBudgetFormOpen(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            {budgetCount > 0 ? 'Edit Budgets' : '+ Set Budgets'}
          </button>
        </div>
        {budgetCount === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No budgets set. Set spending limits per category to track your progress.
          </p>
        ) : (
          <div className="space-y-2">
            {BUDGET_CATEGORIES.filter(c => categoryBudgets[c.value] > 0).map((cat) => (
              <div key={cat.value} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span className="text-sm text-gray-900 dark:text-white">{cat.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {formatCurrency(categoryBudgets[cat.value])} / period
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recurring Transactions Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold dark:text-white">Recurring Transactions</h3>
          <button onClick={openAddRecurring} className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add Recurring</button>
        </div>
        {recurring.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recurring transactions yet. Add one to automate regular income or expenses.</p>
        ) : (
          <div className="space-y-3">
            {recurring.map((rec) => {
              const accountName = accounts.find(a => a.id === rec.accountId)?.name || 'Primary';
              return (
                <div key={rec.id} className={`py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${!rec.isActive ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rec.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-medium text-gray-900 dark:text-white">{rec.description}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                        {getFrequencyLabel(rec.frequency)} • Next: {formatDate(rec.nextDueDate)} • {accountName}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-medium ${rec.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                        {rec.type === 'income' ? '+' : '−'}{formatCurrency(rec.amount)}
                      </span>
                      <div className="flex items-center gap-2 text-sm">
                        <button onClick={() => openEditRecurring(rec)} className="text-primary-600 hover:text-primary-700">Edit</button>
                        <button onClick={() => handleToggleRecurring(rec)} className="text-gray-500 hover:text-gray-700">{rec.isActive ? 'Pause' : 'Resume'}</button>
                        <button onClick={() => handleDeleteRecurring(rec)} className="text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Form Modal */}
      {accountFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">{editingAccount ? 'Edit Account' : 'Add Account'}</h2>
            <form onSubmit={handleSaveAccount}>
              <div className="mb-4">
                <label htmlFor="accName" className="label">Account Name</label>
                <input type="text" id="accName" className="input" value={accountFormData.name} onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })} placeholder="Primary Checking" required />
              </div>
              
              {!editingAccount && (
                <div className="mb-4">
                  <label htmlFor="accType" className="label">Account Type</label>
                  <select id="accType" className="input" value={accountFormData.type} onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value })}>
                    {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="accBalance" className="label">
                  {(accountFormData.type === 'credit_card' || editingAccount?.type === 'credit_card') ? 'Current Balance Owed' : 'Current Balance'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input type="number" id="accBalance" className="input pl-7" value={accountFormData.currentBalance} onChange={(e) => setAccountFormData({ ...accountFormData, currentBalance: e.target.value })} step="0.01" placeholder="0.00" required />
                </div>
                {(accountFormData.type === 'credit_card' || editingAccount?.type === 'credit_card') && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter 0 if card is paid off</p>
                )}
              </div>
              
              {(accountFormData.type === 'credit_card' || editingAccount?.type === 'credit_card') && (
                <>
                  <div className="mb-4">
                    <label htmlFor="creditLimit" className="label">Credit Limit</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input type="number" id="creditLimit" className="input pl-7" value={accountFormData.creditLimit} onChange={(e) => setAccountFormData({ ...accountFormData, creditLimit: e.target.value })} step="0.01" placeholder="5000.00" required />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="apr" className="label">APR % <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="relative">
                      <input type="number" id="apr" className="input pr-7" value={accountFormData.apr} onChange={(e) => setAccountFormData({ ...accountFormData, apr: e.target.value })} step="0.01" placeholder="24.99" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="ccDueDay" className="label">Due Day <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="number" id="ccDueDay" className="input" value={accountFormData.dueDay} onChange={(e) => setAccountFormData({ ...accountFormData, dueDay: e.target.value })} min="1" max="31" placeholder="15" />
                  </div>
                </>
              )}
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setAccountFormOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={accountFormLoading}>
                  {accountFormLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving...
                    </span>
                  ) : editingAccount ? 'Save' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Form Modal */}
      {budgetFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2 dark:text-white">Category Budgets</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Set spending limits per pay period. Leave blank for no limit.</p>
            <form onSubmit={handleSaveBudgets}>
              <div className="space-y-3 mb-6">
                {BUDGET_CATEGORIES.map((cat) => (
                  <div key={cat.value} className="flex items-center gap-3">
                    <span className="text-lg w-6">{cat.emoji}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{cat.label}</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        className="input pl-6 py-1.5 text-sm"
                        value={categoryBudgets[cat.value] || ''}
                        onChange={(e) => setCategoryBudgets({ ...categoryBudgets, [cat.value]: e.target.value })}
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setBudgetFormOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={budgetFormLoading}>
                  {budgetFormLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving...
                    </span>
                  ) : 'Save Budgets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recurring Form Modal */}
      {recurringFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">{editingRecurring ? 'Edit Recurring' : 'Add Recurring Transaction'}</h2>
            <form onSubmit={handleSaveRecurring}>
              <div className="mb-4">
                <label htmlFor="recDesc" className="label">Description</label>
                <input type="text" id="recDesc" className="input" value={recurringFormData.description} onChange={(e) => setRecurringFormData({ ...recurringFormData, description: e.target.value })} placeholder="Salary, Gym membership..." required />
              </div>

              <div className="mb-4">
                <label htmlFor="recType" className="label">Type</label>
                <select id="recType" className="input" value={recurringFormData.type} onChange={(e) => setRecurringFormData({ ...recurringFormData, type: e.target.value })}>
                  {RECURRING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="recAmount" className="label">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input type="number" id="recAmount" className="input pl-7" value={recurringFormData.amount} onChange={(e) => setRecurringFormData({ ...recurringFormData, amount: e.target.value })} step="0.01" min="0" placeholder="0.00" required />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="recFreq" className="label">Frequency</label>
                <select id="recFreq" className="input" value={recurringFormData.frequency} onChange={(e) => setRecurringFormData({ ...recurringFormData, frequency: e.target.value })}>
                  {RECURRING_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              {!editingRecurring && (
                <div className="mb-4">
                  <label htmlFor="recStart" className="label">Start Date</label>
                  <input type="date" id="recStart" className="input" value={recurringFormData.startDate} onChange={(e) => setRecurringFormData({ ...recurringFormData, startDate: e.target.value })} required />
                </div>
              )}

              {accounts.length > 1 && (
                <div className="mb-4">
                  <label htmlFor="recAccount" className="label">Account</label>
                  <select id="recAccount" className="input" value={recurringFormData.accountId} onChange={(e) => setRecurringFormData({ ...recurringFormData, accountId: e.target.value })}>
                    {accounts.filter(a => a.type !== 'credit_card').map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setRecurringFormOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={recurringFormLoading}>
                  {recurringFormLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving...
                    </span>
                  ) : editingRecurring ? 'Save' : 'Add Recurring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
