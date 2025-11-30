import { useState, useEffect } from 'react';
import { fetchBills, createBill, updateBill, deleteBill } from '../services/api';
import { formatCurrency } from '../utils/format';

export default function BillsPage({ onBack }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDay: '',
    isAutoPay: false,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await fetchBills(true); // Include inactive
      setBills(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingBill(null);
    setFormData({ name: '', amount: '', dueDay: '', isAutoPay: false });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (bill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      dueDay: bill.dueDay.toString(),
      isAutoPay: bill.isAutoPay,
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBill(null);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const billData = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        frequency: 'monthly',
        dueDay: parseInt(formData.dueDay, 10),
        isAutoPay: formData.isAutoPay,
      };

      if (editingBill) {
        await updateBill(editingBill.id, billData);
      } else {
        await createBill(billData);
      }

      closeForm();
      loadBills();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (bill) => {
    if (!confirm(`Delete "${bill.name}"?`)) return;

    try {
      await deleteBill(bill.id);
      loadBills();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (bill) => {
    try {
      await updateBill(bill.id, { isActive: !bill.isActive });
      loadBills();
    } catch (err) {
      setError(err.message);
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Bills</h1>
          </div>
          <button onClick={openAddForm} className="btn-primary">
            + Add Bill
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {bills.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">No bills yet</p>
            <button onClick={openAddForm} className="btn-primary">
              Add Your First Bill
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className={`card flex items-center justify-between ${
                  !bill.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      bill.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{bill.name}</p>
                    <p className="text-sm text-gray-500">
                      Due on the {ordinal(bill.dueDay)} • {bill.isAutoPay ? 'Auto-pay' : 'Manual'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(bill.amount)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(bill)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(bill)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {bill.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => handleDelete(bill)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monthly Total */}
        {bills.length > 0 && (
          <div className="mt-6 card bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Monthly Total (Active)</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(
                  bills
                    .filter((b) => b.isActive)
                    .reduce((sum, b) => sum + b.amount, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingBill ? 'Edit Bill' : 'Add Bill'}
            </h2>

            {formError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="label">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Rent, Electric, Netflix..."
                  required
                />
              </div>

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
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="dueDay" className="label">
                  Due Day of Month
                </label>
                <input
                  type="number"
                  id="dueDay"
                  className="input"
                  value={formData.dueDay}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDay: e.target.value })
                  }
                  placeholder="1-31"
                  min="1"
                  max="31"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use 31 for "last day of month"
                </p>
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    checked={formData.isAutoPay}
                    onChange={(e) =>
                      setFormData({ ...formData, isAutoPay: e.target.checked })
                    }
                  />
                  <span className="text-sm text-gray-700">Auto-pay enabled</span>
                </label>
              </div>

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
                  className="btn-primary flex-1"
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : editingBill ? 'Save' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for ordinal suffixes (1st, 2nd, 3rd, etc.)
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
