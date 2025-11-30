import { useState, useEffect, useMemo } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import { SkeletonTransactionList } from '../../components/Skeleton';
import { EmptyTransactions } from '../../components/EmptyState';
import { getCategoryEmoji, CATEGORIES } from '../../utils/categories';

export default function TransactionsView() {
  const confirm = useConfirm();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [bills, setBills] = useState([]);
  const [formData, setFormData] = useState({ date: '', amount: '', description: '', type: 'debit_purchase', billId: '', category: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 20;

  const TYPE_LABELS = { income: 'Income', debit_purchase: 'Purchase', bill_payment: 'Bill Payment', transfer: 'Transfer', cc_payment: 'Card Payment' };
  const TYPE_COLORS = { income: 'text-green-600', debit_purchase: 'text-gray-900 dark:text-white', bill_payment: 'text-gray-900 dark:text-white', transfer: 'text-purple-600', cc_payment: 'text-orange-600' };

  const accountMap = accounts.reduce((acc, account) => { acc[account.id] = account.name; return acc; }, {});

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (accounts.length > 0) loadTransactions(); }, [filterAccountId, startDate, endDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const { fetchTransactions, fetchAccounts } = await import('../../services/api');
      const [txnResult, accountsData] = await Promise.all([
        fetchTransactions({ limit, offset: 0 }),
        fetchAccounts()
      ]);
      setTransactions(txnResult.transactions);
      setHasMore(txnResult.pagination.hasMore);
      setAccounts(accountsData);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const loadTransactions = async (loadMore = false) => {
    try {
      if (loadMore) setLoadingMore(true);
      else setLoading(true);
      const { fetchTransactions } = await import('../../services/api');
      const newOffset = loadMore ? offset + limit : 0;
      const params = { limit, offset: newOffset };
      if (filterAccountId) params.accountId = filterAccountId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const result = await fetchTransactions(params);
      setTransactions(loadMore ? [...transactions, ...result.transactions] : result.transactions);
      setHasMore(result.pagination.hasMore);
      setOffset(newOffset);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); setLoadingMore(false); }
  };

  // Client-side filtering for search and category
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Filter by search query (description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(txn => 
        txn.description.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(txn => txn.category === filterCategory);
    }
    
    return filtered;
  }, [transactions, searchQuery, filterCategory]);

  const handleFilterChange = (accountId) => {
    setFilterAccountId(accountId);
    setOffset(0);
  };

  const clearFilters = () => {
    setFilterAccountId('');
    setFilterCategory('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
    loadTransactions();
  };

  const hasActiveFilters = filterAccountId || filterCategory || searchQuery || startDate || endDate;

  const openEditModal = async (txn) => {
    if (txn.type === 'transfer' || txn.type === 'cc_payment') {
      setError('Transfer and card payment transactions cannot be edited. Delete and recreate if needed.');
      return;
    }
    setEditingTxn(txn);
    setFormData({ date: txn.date, amount: txn.amount.toString(), description: txn.description, type: txn.type, billId: txn.billId || '', category: txn.category || '' });
    setFormError('');
    if (bills.length === 0) {
      try { const { fetchBills } = await import('../../services/api'); setBills(await fetchBills()); } catch (err) { console.error(err); }
    }
  };

  const closeEditModal = () => { setEditingTxn(null); setFormError(''); };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const { updateTransaction } = await import('../../services/api');
      await updateTransaction(editingTxn.id, { 
        date: formData.date, 
        amount: parseFloat(formData.amount), 
        description: formData.description, 
        type: formData.type, 
        billId: formData.type === 'bill_payment' && formData.billId ? formData.billId : null,
        category: formData.category || null
      });
      closeEditModal();
      loadTransactions();
    } catch (err) { setFormError(err.message); } 
    finally { setFormLoading(false); }
  };

  const handleDelete = async (txn) => {
    const confirmed = await confirm({
      title: 'Delete Transaction',
      message: `Delete "${txn.description}" for ${formatCurrency(txn.amount)}? This will update your account balance.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;
    try { const { deleteTransaction } = await import('../../services/api'); await deleteTransaction(txn.id); loadTransactions(); } 
    catch (err) { setError(err.message); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const formatDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const { fetchTransactions } = await import('../../services/api');
      const params = { limit: 1000, offset: 0 };
      if (filterAccountId) params.accountId = filterAccountId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const result = await fetchTransactions(params);
      
      let txnsToExport = result.transactions;
      // Apply client-side filters
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        txnsToExport = txnsToExport.filter(txn => txn.description.toLowerCase().includes(query));
      }
      if (filterCategory) {
        txnsToExport = txnsToExport.filter(txn => txn.category === filterCategory);
      }
      
      const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Account'];
      const rows = txnsToExport.map(txn => [
        txn.date,
        `"${txn.description.replace(/"/g, '""')}"`,
        TYPE_LABELS[txn.type] || txn.type,
        txn.category || '',
        txn.type === 'income' ? txn.amount : -txn.amount,
        accountMap[txn.accountId] || ''
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safespan-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const getTransactionLabel = (txn) => {
    if (txn.type === 'transfer' || txn.type === 'cc_payment') {
      const fromName = accountMap[txn.accountId] || 'Unknown';
      const toName = accountMap[txn.toAccountId] || 'Unknown';
      return `${fromName} → ${toName}`;
    }
    const parts = [TYPE_LABELS[txn.type] || txn.type];
    if (accounts.length > 1 && txn.accountId && accountMap[txn.accountId]) {
      parts.push(accountMap[txn.accountId]);
    }
    return parts.join(' • ');
  };

  if (loading && transactions.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6 animate-pulse"></div>
        <SkeletonTransactionList count={5} />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transactions</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary text-sm inline-flex items-center gap-1.5 ${hasActiveFilters ? 'ring-2 ring-primary-500' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {hasActiveFilters && <span className="w-2 h-2 bg-primary-500 rounded-full"></span>}
            </button>
            <button
              onClick={exportToCSV}
              disabled={exporting || filteredTransactions.length === 0}
              className="btn-secondary text-sm inline-flex items-center gap-1.5"
            >
              {exporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar - always visible */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {accounts.length > 1 && (
                <div>
                  <label className="label">Account</label>
                  <select
                    value={filterAccountId}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="label">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
                  className="input text-sm"
                />
              </div>
              
              <div>
                <label className="label">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
                  className="input text-sm"
                />
              </div>
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      
      {filteredTransactions.length === 0 ? (
        searchQuery || filterCategory ? (
          <div className="card text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No transactions match your search.</p>
            <button onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
              Clear filters
            </button>
          </div>
        ) : (
          <EmptyTransactions />
        )
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </p>
          <div className="card divide-y divide-gray-100 dark:divide-gray-700">
            {filteredTransactions.map((txn) => (
              <div key={txn.id} className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-4 px-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {txn.category && (
                      <span className="text-lg" title={txn.category}>
                        {getCategoryEmoji(txn.category)}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{txn.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(txn.date)} • {getTransactionLabel(txn)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className={`font-semibold whitespace-nowrap ${TYPE_COLORS[txn.type]}`}>
                      {txn.type === 'income' ? '+' : (txn.type === 'transfer' || txn.type === 'cc_payment') ? '' : '−'}{formatCurrency(txn.amount)}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      {txn.type !== 'transfer' && txn.type !== 'cc_payment' && <button onClick={() => openEditModal(txn)} className="text-primary-600 hover:text-primary-700">Edit</button>}
                      <button onClick={() => handleDelete(txn)} className="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && !searchQuery && !filterCategory && (
            <div className="mt-6 text-center">
              <button onClick={() => loadTransactions(true)} disabled={loadingMore} className="btn-secondary inline-flex items-center gap-2">
                {loadingMore ? <><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>Loading...</> : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {editingTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Edit Transaction</h2>
            {formError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label htmlFor="date" className="label">Date</label>
                <input type="date" id="date" className="input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label htmlFor="type" className="label">Type</label>
                <select id="type" className="input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, billId: '' })}>
                  <option value="debit_purchase">Expense</option>
                  <option value="income">Income</option>
                  <option value="bill_payment">Bill Payment</option>
                </select>
              </div>
              {formData.type === 'bill_payment' && (
                <div className="mb-4">
                  <label htmlFor="billId" className="label">Bill</label>
                  <select id="billId" className="input" value={formData.billId} onChange={(e) => setFormData({ ...formData, billId: e.target.value })}>
                    <option value="">No bill linked</option>
                    {bills.map((bill) => <option key={bill.id} value={bill.id}>{bill.name}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="category" className="label">Category</label>
                <select id="category" className="input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">No category</option>
                  {CATEGORIES.filter(c => formData.type === 'income' ? c.value === 'income' : c.value !== 'income').map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="amount" className="label">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input type="number" id="amount" className="input pl-7" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} step="0.01" min="0" required />
                </div>
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="label">Description</label>
                <input type="text" id="description" className="input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={closeEditModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={formLoading}>
                  {formLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
