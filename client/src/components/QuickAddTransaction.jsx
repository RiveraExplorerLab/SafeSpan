import { useState, useEffect } from 'react';
import { createTransaction, fetchBills } from '../services/api';
import { CATEGORIES } from '../utils/categories';

export default function QuickAddTransaction({ onSuccess, accounts = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && type === 'bill_payment' && bills.length === 0) {
      fetchBills().then(setBills).catch(console.error);
    }
  }, [isOpen, type, bills.length]);

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

      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setDescription('');
      setType('debit_purchase');
      setCategory('');
      setBillId('');
      setToAccountId('');
      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentAccount = accounts.find(a => a.id === accountId);
  const isUsingCreditCard = currentAccount?.type === 'credit_card';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary w-full"
      >
        + Add Transaction
      </button>
    );
  }

  const typeButtonClass = (active, color) => {
    const baseClass = 'flex-1 min-w-[70px] py-2 px-2 rounded-lg text-sm font-medium border transition-colors';
    if (active) {
      return `${baseClass} border-${color}-500 bg-${color}-50 text-${color}-700`;
    }
    return `${baseClass} border-gray-200 text-gray-600 hover:bg-gray-50`;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Add Transaction</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Type Selection */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType('debit_purchase')}
            className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-sm font-medium border ${
              type === 'debit_purchase'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-sm font-medium border ${
              type === 'income'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setType('bill_payment')}
            className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-sm font-medium border ${
              type === 'bill_payment'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Bill
          </button>
          {hasMultipleAccounts && (
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-sm font-medium border ${
                type === 'transfer'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Transfer
            </button>
          )}
          {hasCreditCards && bankAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => setType('cc_payment')}
              className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-sm font-medium border ${
                type === 'cc_payment'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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
              className="input"
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
              className="input"
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
              className="input"
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
              className="input"
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
              className="input"
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

        {/* Category */}
        {type !== 'transfer' && type !== 'cc_payment' && (
          <div className="mb-4">
            <label htmlFor="category" className="label">Category</label>
            <select
              id="category"
              className="input"
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
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            required
          />
        </div>

        {/* Amount */}
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              id="amount"
              className="input pl-7"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
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
            className="input"
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

        {/* Credit card purchase hint */}
        {isUsingCreditCard && type === 'debit_purchase' && (
          <p className="text-xs text-purple-600 mb-4">
            💳 This will increase your credit card balance
          </p>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Adding...
              </span>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
