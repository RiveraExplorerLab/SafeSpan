import { formatCurrency, formatDate } from '../utils/format';
import { getCategoryEmoji } from '../utils/categories';
import { deleteTransaction } from '../services/api';
import { useState, useRef } from 'react';
import { useConfirm } from './ConfirmDialog';

const TYPE_LABELS = {
  income: 'Income',
  debit_purchase: 'Purchase',
  bill_payment: 'Bill',
  transfer: 'Transfer',
  cc_payment: 'Card Payment',
};

const TYPE_COLORS = {
  income: 'text-green-600 dark:text-green-400',
  debit_purchase: 'text-gray-900 dark:text-white',
  bill_payment: 'text-gray-900 dark:text-white',
  transfer: 'text-purple-600 dark:text-purple-400',
  cc_payment: 'text-orange-600 dark:text-orange-400',
};

export default function RecentTransactionsCard({ transactions, accounts = [], onDelete }) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(null);
  const [swipedId, setSwipedId] = useState(null);

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
      setSwipedId(null);
    }
  };

  const getTransactionLabel = (txn) => {
    if (txn.type === 'transfer' || txn.type === 'cc_payment') {
      const fromName = accountMap[txn.accountId] || '?';
      const toName = accountMap[txn.toAccountId] || '?';
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
      <div className="card card-compact">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Recent Activity</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No recent transactions</p>
      </div>
    );
  }

  return (
    <div className="card card-compact">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Recent Activity</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</span>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-700 -mx-3 sm:-mx-4">
        {transactions.slice(0, 10).map((txn) => (
          <TransactionRow 
            key={txn.id}
            txn={txn}
            getTransactionLabel={getTransactionLabel}
            handleDelete={handleDelete}
            deleting={deleting}
            swipedId={swipedId}
            setSwipedId={setSwipedId}
          />
        ))}
      </ul>

      {transactions.length > 10 && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
          +{transactions.length - 10} more transactions
        </p>
      )}
    </div>
  );
}

function TransactionRow({ txn, getTransactionLabel, handleDelete, deleting, swipedId, setSwipedId }) {
  const rowRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isSwiping = useRef(false);
  const isSwiped = swipedId === txn.id;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    
    if (diff > 10) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    const diff = startX.current - currentX.current;
    
    if (diff > 60) {
      setSwipedId(txn.id);
    } else if (isSwiped && diff < -30) {
      setSwipedId(null);
    }
  };

  return (
    <li 
      ref={rowRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button revealed on swipe */}
      <div className={`absolute right-0 top-0 bottom-0 flex items-center justify-end bg-red-500 transition-all duration-200 ${
        isSwiped ? 'w-20' : 'w-0'
      }`}>
        <button
          onClick={() => handleDelete(txn)}
          disabled={deleting === txn.id}
          className="w-full h-full flex items-center justify-center text-white font-medium text-sm"
        >
          {deleting === txn.id ? '...' : 'Delete'}
        </button>
      </div>

      {/* Transaction content */}
      <div 
        className={`flex items-center justify-between py-2.5 sm:py-3 px-3 sm:px-4 bg-white dark:bg-gray-800 transition-transform duration-200 ${
          isSwiped ? '-translate-x-20' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {txn.category && (
            <span className="text-lg sm:text-xl flex-shrink-0" title={txn.category}>
              {getCategoryEmoji(txn.category)}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {txn.description}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {formatDate(txn.date)} • {getTransactionLabel(txn)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`text-sm font-semibold whitespace-nowrap ${TYPE_COLORS[txn.type]}`}>
            {txn.type === 'income' ? '+' : (txn.type === 'transfer' || txn.type === 'cc_payment') ? '' : '−'}
            {formatCurrency(txn.amount)}
          </span>
          {/* Desktop delete button */}
          <button
            onClick={() => handleDelete(txn)}
            disabled={deleting === txn.id}
            className="hidden sm:block p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}
