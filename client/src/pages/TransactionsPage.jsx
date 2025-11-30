import { useState, useEffect } from 'react';
import { fetchTransactions, updateTransaction, deleteTransaction, fetchBills } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

const TYPE_LABELS = {
  income: 'Income',
  debit_purchase: 'Purchase',
  bill_payment: 'Bill Payment',
};

const TRANSACTION_TYPES = [
  { value: 'debit_purchase', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'bill_payment', label: 'Bill Payment' },
];

export default function TransactionsPage({ onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Edit modal state
  const [editingTxn, setEditingTxn] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    description: '',
    type: 'debit_purchase',
    billId: '',
  });
  const [bills, setBills] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async (loadMore = false) => {
    try {
      setLoading(true);
      const newOffset = loadMore ? offset + limit : 0;
      const result = await fetchTransactions({ limit, offset: newOffset });
      
      if (loadMore) {
        setTransactions([...transactions, ...result.transactions]);
      } else {
        setTransactions(result.transactions);
      }
      
      setHasMore(result.pagination.hasMore);
      setOffset(newOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = async (txn) => {
    setEditingTxn(txn);
    setFormData({
      date: txn.date,
      amount: txn.amount.toString(),
      description: txn.description,
      type: txn.type,
      billId: txn.billId || '',
    });
    setFormError('');
    
    // Load bills if needed
    if (bills.length === 0) {
      try {
        const billsData = await fetchBills();
        setBills(billsData);
      } catch (err) {
        console.error('Failed to load bills:', err);
      }
    }
  };

  const closeEditModal = () => {
    setEditingTxn(null);
    setFormError('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const updates = {
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description,
        type: formData.type,
      };

      if (formData.type === 'bill_payment' && formData.billId) {
        updates.billId = formData.billId;
      } else {
        updates.billId = null;
      }

      await updateTransaction(editingTxn.id, updates);
      closeEditModal();
      loadTransactions();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (txn) => {
    if (!confirm(`Delete "${txn.description}" for ${formatCurrency(txn.amount)}?`)) {
      return;
    }

    try {
      await deleteTransaction(txn.id);
      loadTransactions();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {loading && transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <>
            <div className="card divide-y divide-gray-100">
              {transactions.map((txn) => (
                <div key={txn.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{txn.description}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatDate(txn.date)} • {TYPE_LABELS[txn.type] || txn.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${
                        txn.type === 'income' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {txn.type === 'income' ? '+' : '−'}
                        {formatCurrency(txn.amount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(txn)}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(txn)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => loadTransactions(true)}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editingTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Edit Transaction</h2>

            {formError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdate}>
              {/* Date */}
              <div className="mb-4">
                <label htmlFor="date" className="label">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              {/* Type */}
              <div className="mb-4">
                <label htmlFor="type" className="label">
                  Type
                </label>
                <select
                  id="type"
                  className="input"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value, billId: '' })
                  }
                >
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bill Selector */}
              {formData.type === 'bill_payment' && (
                <div className="mb-4">
                  <label htmlFor="billId" className="label">
                    Bill
                  </label>
                  <select
                    id="billId"
                    className="input"
                    value={formData.billId}
                    onChange={(e) =>
                      setFormData({ ...formData, billId: e.target.value })
                    }
                  >
                    <option value="">No bill linked</option>
                    {bills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.name} (${bill.amount})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div className="mb-4">
                <label htmlFor="amount" className="label">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    id="amount"
                    className="input pl-7"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label htmlFor="description" className="label">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  className="input"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
