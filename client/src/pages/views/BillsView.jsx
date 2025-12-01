import { useState, useEffect } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import { SkeletonBillCard } from '../../components/Skeleton';
import { EmptyBills } from '../../components/EmptyState';

export default function BillsView({ onRefresh }) {
  const confirm = useConfirm();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [formData, setFormData] = useState({ name: '', amount: '', dueDay: '', isAutoPay: false, autoMarkPaid: false, alreadyPaid: false });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { loadBills(); }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const { fetchBills } = await import('../../services/api');
      setBills(await fetchBills(true));
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const openAddForm = () => {
    setEditingBill(null);
    setFormData({ name: '', amount: '', dueDay: '', isAutoPay: false, autoMarkPaid: false, alreadyPaid: false });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (bill) => {
    setEditingBill(bill);
    setFormData({ name: bill.name, amount: bill.amount.toString(), dueDay: bill.dueDay.toString(), isAutoPay: bill.isAutoPay, autoMarkPaid: bill.autoMarkPaid || false, alreadyPaid: false });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => { setIsFormOpen(false); setEditingBill(null); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const { createBill, updateBill } = await import('../../services/api');
      const billData = { 
        name: formData.name, 
        amount: parseFloat(formData.amount), 
        frequency: 'monthly', 
        dueDay: parseInt(formData.dueDay, 10), 
        isAutoPay: formData.isAutoPay,
        autoMarkPaid: formData.autoMarkPaid,
        // Only send alreadyPaid for new bills
        ...(editingBill ? {} : { alreadyPaid: formData.alreadyPaid })
      };
      if (editingBill) await updateBill(editingBill.id, billData);
      else await createBill(billData);
      closeForm();
      loadBills();
      onRefresh?.();
    } catch (err) { setFormError(err.message); } 
    finally { setFormLoading(false); }
  };

  const handleDelete = async (bill) => {
    const confirmed = await confirm({
      title: 'Delete Bill',
      message: `Are you sure you want to delete "${bill.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      const { deleteBill } = await import('../../services/api');
      await deleteBill(bill.id);
      loadBills();
      onRefresh?.();
    } catch (err) { setError(err.message); }
  };

  const handleToggleActive = async (bill) => {
    try {
      const { updateBill } = await import('../../services/api');
      await updateBill(bill.id, { isActive: !bill.isActive });
      loadBills();
      onRefresh?.();
    } catch (err) { setError(err.message); }
  };

  const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
        </div>
        <div className="space-y-3">{[1, 2, 3].map(i => <SkeletonBillCard key={i} />)}</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bills</h2>
        <button onClick={openAddForm} className="btn-primary text-sm inline-flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Bill
        </button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {bills.length === 0 ? (
        <EmptyBills onAdd={openAddForm} />
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <div key={bill.id} className={`card transition-all ${!bill.isActive ? 'opacity-50' : 'hover:shadow-md'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${bill.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{bill.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Due on the {ordinal(bill.dueDay)} • {bill.isAutoPay ? 'Auto-pay' : 'Manual'}{bill.autoMarkPaid ? ' • Auto-mark' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-6 sm:pl-0">
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(bill.amount)}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => openEditForm(bill)} className="text-primary-600 hover:text-primary-700">Edit</button>
                    <button onClick={() => handleToggleActive(bill)} className="text-gray-500 hover:text-gray-700">{bill.isActive ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => handleDelete(bill)} className="text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {bills.length > 0 && (
        <div className="mt-6 card bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700 dark:text-gray-300">Monthly Total (Active)</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(bills.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0))}</span>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <h2 className="text-lg font-semibold mb-4">{editingBill ? 'Edit Bill' : 'Add Bill'}</h2>
            {formError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="label">Name</label>
                <input type="text" id="name" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Rent, Electric, Netflix..." required />
              </div>
              <div className="mb-4">
                <label htmlFor="amount" className="label">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input type="number" id="amount" className="input pl-7" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" step="0.01" min="0" required />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="dueDay" className="label">Due Day of Month</label>
                <input type="number" id="dueDay" className="input" value={formData.dueDay} onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })} placeholder="1-31" min="1" max="31" required />
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={formData.isAutoPay} onChange={(e) => setFormData({ ...formData, isAutoPay: e.target.checked })} />
                  <span className="text-sm text-gray-700">Auto-pay enabled</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">This bill is set up to pay automatically</p>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={formData.autoMarkPaid} onChange={(e) => setFormData({ ...formData, autoMarkPaid: e.target.checked })} />
                  <span className="text-sm text-gray-700">Auto-mark as paid</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Automatically mark this bill as paid on its due date</p>
              </div>
              {/* Only show "Already Paid" option when adding a new bill */}
              {!editingBill && (
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={formData.alreadyPaid} onChange={(e) => setFormData({ ...formData, alreadyPaid: e.target.checked })} />
                    <span className="text-sm text-gray-700">Already paid this period</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">Mark if you've already paid this bill this month</p>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={formLoading}>
                  {formLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving...
                    </span>
                  ) : editingBill ? 'Save' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
