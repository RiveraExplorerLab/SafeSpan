import { formatCurrency, daysUntilText } from '../utils/format';

export default function SafeToSpendCard({ safeToSpend, nextPayDate }) {
  const { currentBalance, requiredReserve, safeAmount } = safeToSpend;

  return (
    <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
      <div className="text-center">
        <p className="text-primary-100 text-sm font-medium uppercase tracking-wide">
          Safe to Spend
        </p>
        <p className="text-4xl font-bold mt-2">
          {formatCurrency(safeAmount)}
        </p>
        {nextPayDate && (
          <p className="text-primary-100 text-sm mt-2">
            until payday ({daysUntilText(nextPayDate)})
          </p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-primary-400/30">
        <div className="flex justify-between text-sm">
          <span className="text-primary-100">Current Balance</span>
          <span className="font-medium">{formatCurrency(currentBalance)}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-primary-100">Reserved for Bills</span>
          <span className="font-medium">−{formatCurrency(requiredReserve)}</span>
        </div>
      </div>
    </div>
  );
}
