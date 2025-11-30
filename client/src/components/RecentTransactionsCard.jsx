import { formatCurrency, formatDate } from '../utils/format';
import { getCategoryEmoji } from '../utils/categories';
import { deleteTransaction } from '../services/api';
import { useState } from 'react';
import { useConfirm } from './ConfirmDialog';

const TYPE_LABELS = {
  income: 'Income',
  debit_purchase: 'Purchase',
  bill_payment: 'Bill Payment',
  transfer: 'Transfer',
  cc_payment: 'Card Payment',
};

const TYPE_COLORS = {
  income: 'text-green-600',
  debit_purchase: 'text-gray-900',
  bill_payment: 'text-gray-900',
  transfer: 'text-purple-600',
  cc_payment: 'text-orange-600',
};

export default function RecentTransactionsCard({ transactions, accounts = [], onDelete }) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(null);

  const accountMap = accounts.reduce((acc, account) => {
    acc[account.id] = account.name;
    return acc;
  }, {});

  const handleDelete = async (txn) => {
    const confirmed = await confirm({
      title: 'Delete Transaction',
      message: `Delete "${txn.description}" for ${formatCurrency(txn.amount)}?`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    setDeleting(txn.id);
    try {
      await deleteTransaction(txn.id);
      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(null);
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

  if (!transactions || transactions.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Recent Transactions</h3>
        <p className="text-gray-500 text-sm">No recent transactions</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-4">Recent Transactions</h3>

      <ul className="divide-y divide-gray-100">
        {transactions.map((txn) => (
          <li key={txn.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {txn.category && (
                  <span className="text-base mt-0.5" title={txn.category}>
                    {getCategoryEmoji(txn.category)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {txn.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(txn.date)} • {getTransactionLabel(txn)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className={`text-sm font-medium whitespace-nowrap ${TYPE_COLORS[txn.type]}`}>
                  {txn.type === 'income' ? '+' : (txn.type === 'transfer' || txn.type === 'cc_payment') ? '' : '−'}
                  {formatCurrency(txn.amount)}
                </span>
                <button
                  onClick={() => handleDelete(txn)}
                  disabled={deleting === txn.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deleting === txn.id ? '...' : '✕'}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
