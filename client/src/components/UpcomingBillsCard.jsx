import { useState, useRef } from 'react';
import { formatCurrency, formatDate, daysUntil } from '../utils/format';
import { markBillPaid } from '../services/api';

export default function UpcomingBillsCard({ bills, onUpdate }) {
  const [processingId, setProcessingId] = useState(null);

  if (!bills || bills.length === 0) {
    return (
      <div className="card card-compact">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Upcoming Bills</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No bills due before payday</p>
      </div>
    );
  }

  const totalDue = bills
    .filter((b) => !b.isPaidThisPeriod)
    .reduce((sum, b) => sum + b.amount, 0);

  const paidCount = bills.filter(b => b.isPaidThisPeriod).length;

  const handleMarkPaid = async (billId) => {
    setProcessingId(billId);
    try {
      await markBillPaid(billId);
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to mark bill paid:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="card card-compact">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Upcoming Bills</h3>
        <div className="text-right">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(totalDue)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">due</span>
        </div>
      </div>

      {/* Progress indicator */}
      {bills.length > 0 && (
        <div className="mb-3">
          <div className="flex gap-1">
            {bills.map((bill) => (
              <div 
                key={bill.id}
                className={`h-1.5 flex-1 rounded-full ${
                  bill.isPaidThisPeriod 
                    ? 'bg-green-500' 
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {paidCount} of {bills.length} paid
          </p>
        </div>
      )}

      <ul className="space-y-1 -mx-3 sm:-mx-4">
        {bills.map((bill) => (
          <BillRow 
            key={bill.id}
            bill={bill}
            onMarkPaid={handleMarkPaid}
            processing={processingId === bill.id}
          />
        ))}
      </ul>
    </div>
  );
}

function BillRow({ bill, onMarkPaid, processing }) {
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const days = daysUntil(bill.dueDate);
  const isUrgent = !bill.isPaidThisPeriod && days <= 3;

  const handleTouchStart = (e) => {
    if (bill.isPaidThisPeriod) return;
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (bill.isPaidThisPeriod) return;
    currentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (bill.isPaidThisPeriod) return;
    const diff = startX.current - currentX.current;
    
    if (diff > 60) {
      setSwiped(true);
    } else if (swiped && diff < -30) {
      setSwiped(false);
    }
  };

  return (
    <li 
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mark paid button revealed on swipe */}
      {!bill.isPaidThisPeriod && (
        <div className={`absolute right-0 top-0 bottom-0 flex items-center justify-end bg-green-500 transition-all duration-200 ${
          swiped ? 'w-24' : 'w-0'
        }`}>
          <button
            onClick={() => {
              onMarkPaid(bill.id);
              setSwiped(false);
            }}
            disabled={processing}
            className="w-full h-full flex items-center justify-center text-white font-medium text-sm"
          >
            {processing ? '...' : 'Mark Paid'}
          </button>
        </div>
      )}

      {/* Bill content */}
      <div 
        className={`flex items-center justify-between py-2.5 px-3 sm:px-4 bg-white dark:bg-gray-800 transition-transform duration-200 ${
          swiped && !bill.isPaidThisPeriod ? '-translate-x-24' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              bill.isPaidThisPeriod
                ? 'bg-green-500'
                : isUrgent
                ? 'bg-amber-500'
                : 'bg-gray-300 dark:bg-gray-500'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${
              bill.isPaidThisPeriod 
                ? 'text-gray-400 dark:text-gray-500 line-through' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {bill.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {bill.isPaidThisPeriod ? (
                <span className="text-green-600 dark:text-green-400">Paid ✓</span>
              ) : (
                <>
                  {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}
                  {bill.isAutoPay && <span className="hidden sm:inline"> • Auto</span>}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`text-sm font-semibold flex-shrink-0 ${
            bill.isPaidThisPeriod 
              ? 'text-gray-400 dark:text-gray-500' 
              : 'text-gray-900 dark:text-white'
          }`}>
            {formatCurrency(bill.amount)}
          </span>
          {/* Desktop mark paid button */}
          {!bill.isPaidThisPeriod && (
            <button
              onClick={() => onMarkPaid(bill.id)}
              disabled={processing}
              className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {processing ? '...' : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Paid
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
