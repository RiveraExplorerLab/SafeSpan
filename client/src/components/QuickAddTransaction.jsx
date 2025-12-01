import { useState, useEffect } from 'react';
import { createTransaction, fetchBills } from '../services/api';
import { CATEGORIES } from '../utils/categories';

export default function QuickAddTransaction({ onSuccess, accounts = [], isOpen, onClose, showTrigger = true }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Support both internal and external control
  const modalOpen = isOpen !== undefined ? isOpen : internalOpen;
  const closeModal = onClose || (() => setInternalOpen(false));
  const openModal = () => setInternalOpen(true);

  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('debit_purchase');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [billId, setBillId] = useState('');
  const [bills, setBills] = useState([]);

  const bankAccounts = accounts.filter(a => a.type !== 'credit_card');
  const creditCards = accounts.filter(a => a.type === 'credit_card');
  const hasMultipleAccounts = accounts.length > 1;
  const hasCreditCards = creditCards.length > 0;

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const defaultAccount = bankAccounts[0] || accounts[0];
      setAccountId(defaultAccount.id);
    }
  }, [accounts, accountId, bankAccounts]);

  useEffect(() => {
    if (modalOpen) {
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen && type === 'bill_payment' && bills.length === 0) {
      fetchBills().then(setBills).catch(console.error);
    }
  }, [modalOpen, type, bills.length]);

  useEffect(() => {
    if (billId && type === 'bill_payment') {
      const selectedBill = bills.find((b) => b.id === billId);
      if (selectedBill) {
        setAmount(selectedBill.amount.toString());
        setDescription(selectedBill.name);
      }
    }
  }, [billId, bills, type]);

  useEffect(() => {
    if (type !== 'bill_payment') {
      setBillId('');
    }
    if (type !== 'transfer' && type !== 'cc_payment') {
      setToAccountId('');
    }
    if (type === 'transfer') {
      setDescription('Transfer');
      setCategory('');
    }
    if (type === 'cc_payment') {
      setDescription('Credit Card Payment');
      setCategory('');
      if (bankAccounts.length > 0) {
        setAccountId(bankAccounts[0].id);
      }
      if (creditCards.length > 0) {
        setToAccountId(creditCards[0].id);
        setAmount(creditCards[0].currentBalance.toString());
      }
    }
    if (type === 'income') {
      setCategory('income');
    } else if (type === 'bill_payment') {
      setCategory('utilities');
    } else if (type === 'debit_purchase' && category === 'income') {
      setCategory('');
    }
  }, [type, bankAccounts, creditCards, category]);

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setDescription('');
    setType('debit_purchase');
    setCategory('');
    setBillId('');
    setToAccountId('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const transaction = {
        date,
        amount: parseFloat(amount),
        description,
        type,
        accountId: accountId || undefined,
        category: category || undefined,
      };

      if (type === 'bill_payment' && billId) {
        transaction.billId = billId;
      }

      if ((type === 'transfer' || type === 'cc_payment') && toAccountId) {
        transaction.toAccountId = toAccountId;
      }

      await createTransaction(transaction);
      resetForm();
      closeModal();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    closeModal();
  };

  const currentAccount = accounts.find(a => a.id === accountId);
  const isUsingCreditCard = currentAccount?.type === 'credit_card';

  // Render trigger button (for desktop inline use)
  const triggerButton = showTrigger ? (
    <button
      onClick={openModal}
      className="btn-primary w-full hidden md:block"
    >
      + Add Transaction
    </button>
  ) : null;

  if (!modalOpen) {
    return triggerButton;
  }

  return (
    <>
      {triggerButton}
      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50" 
          onClick={handleClose}
        />
        
        {/* Modal Content - slides up on mobile */}
        <div className="relative w-full md:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-xl shadow-xl max-h-[90vh] overflow-hidden animate-slideUp md:animate-fadeIn md:mx-4">
          {/* Handle bar for mobile */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          <div className="px-4 md:px-6 pb-6 pt-2 md:pt-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Transaction</h3>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Type Selection - Scrollable on mobile */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setType('debit_purchase')}
                  className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-medium border transition-colors ${
                    type === 'debit_purchase'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-medium border transition-colors ${
                    type === 'income'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setType('bill_payment')}
                  className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-medium border transition-colors ${
                    type === 'bill_payment'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Bill
                </button>
                {hasMultipleAccounts && (
                  <button
                    type="button"
                    onClick={() => setType('transfer')}
                    className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-medium border transition-colors ${
                      type === 'transfer'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Transfer
                  </button>
                )}
                {hasCreditCards && bankAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setType('cc_payment')}
                    className={`flex-shrink-0 py-2.5 px-4 rounded-full text-sm font-medium border transition-colors ${
                      type === 'cc_payment'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Pay Card
                  </button>
                )}
              </div>

              {/* Account Selection */}
              {hasMultipleAccounts && type !== 'cc_payment' && (
                <div className="mb-4">
                  <label htmlFor="accountId" className="label">
                    {type === 'transfer' ? 'From Account' : 'Account'}
                  </label>
                  <select
                    id="accountId"
                    className="input h-12"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.type === 'credit_card' ? `(-$${acc.currentBalance.toFixed(2)})` : `($${acc.currentBalance.toFixed(2)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Credit Card Payment - From Account */}
              {type === 'cc_payment' && (
                <div className="mb-4">
                  <label htmlFor="accountId" className="label">Pay From</label>
                  <select
                    id="accountId"
                    className="input h-12"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                  >
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (${acc.currentBalance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Credit Card Payment - To Card */}
              {type === 'cc_payment' && (
                <div className="mb-4">
                  <label htmlFor="toAccountId" className="label">Pay Credit Card</label>
                  <select
                    id="toAccountId"
                    className="input h-12"
                    value={toAccountId}
                    onChange={(e) => {
                      setToAccountId(e.target.value);
                      const card = creditCards.find(c => c.id === e.target.value);
                      if (card) {
                        setAmount(card.currentBalance.toString());
                      }
                    }}
                    required
                  >
                    <option value="">Select credit card...</option>
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} (owes ${card.currentBalance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* To Account (for transfers) */}
              {type === 'transfer' && hasMultipleAccounts && (
                <div className="mb-4">
                  <label htmlFor="toAccountId" className="label">To Account</label>
                  <select
                    id="toAccountId"
                    className="input h-12"
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    required
                  >
                    <option value="">Select account...</option>
                    {accounts
                      .filter((acc) => acc.id !== accountId)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} {acc.type === 'credit_card' ? `(-$${acc.currentBalance.toFixed(2)})` : `($${acc.currentBalance.toFixed(2)})`}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Bill Selector */}
              {type === 'bill_payment' && (
                <div className="mb-4">
                  <label htmlFor="billId" className="label">Select Bill</label>
                  <select
                    id="billId"
                    className="input h-12"
                    value={billId}
                    onChange={(e) => setBillId(e.target.value)}
                    required
                  >
                    <option value="">Choose a bill...</option>
                    {bills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.name} (${bill.amount})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount - Large input for easy mobile entry */}
              <div className="mb-4">
                <label htmlFor="amount" className="label">
                  Amount
                  {type === 'cc_payment' && toAccountId && (
                    <button
                      type="button"
                      onClick={() => {
                        const card = creditCards.find(c => c.id === toAccountId);
                        if (card) setAmount(card.currentBalance.toString());
                      }}
                      className="ml-2 text-xs text-primary-600 hover:text-primary-700"
                    >
                      Pay full balance
                    </button>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    id="amount"
                    className="input h-14 pl-9 text-xl font-semibold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label htmlFor="description" className="label">Description</label>
                <input
                  type="text"
                  id="description"
                  className="input h-12"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    type === 'transfer' ? 'Transfer' : 
                    type === 'cc_payment' ? 'Credit Card Payment' :
                    'What was this for?'
                  }
                  required
                />
              </div>

              {/* Category */}
              {type !== 'transfer' && type !== 'cc_payment' && (
                <div className="mb-4">
                  <label htmlFor="category" className="label">Category</label>
                  <select
                    id="category"
                    className="input h-12"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.filter(c => type === 'income' ? c.value === 'income' : c.value !== 'income').map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date */}
              <div className="mb-4">
                <label htmlFor="date" className="label">Date</label>
                <input
                  type="date"
                  id="date"
                  className="input h-12"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={today}
                  required
                />
              </div>

              {/* Credit card purchase hint */}
              {isUsingCreditCard && type === 'debit_purchase' && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-4">
                  💳 This will increase your credit card balance
                </p>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary flex-1 h-12 text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 h-12 text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Adding...
                    </span>
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
