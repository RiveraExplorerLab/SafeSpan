import { formatCurrency, daysUntilText } from '../utils/format';

export default function SafeToSpendCard({ safeToSpend, nextPayDate }) {
  const { currentBalance, requiredReserve, safeAmount } = safeToSpend;
  
  // Calculate percentage of balance that's safe
  const safePercentage = currentBalance > 0 
    ? Math.round((safeAmount / currentBalance) * 100) 
    : 0;

  // Determine status color
  const getStatusColor = () => {
    if (safeAmount < 0) return 'red';
    if (safePercentage < 20) return 'amber';
    return 'green';
  };
  
  const status = getStatusColor();

  return (
    <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
      </div>

      <div className="relative">
        {/* Hero Amount */}
        <div className="text-center pb-4">
          <p className="text-primary-100 text-sm font-medium uppercase tracking-wider mb-1">
            Safe to Spend
          </p>
          <p className="text-5xl md:text-6xl font-bold tracking-tight">
            {formatCurrency(safeAmount)}
          </p>
          {nextPayDate && (
            <p className="text-primary-100 text-sm mt-2 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {daysUntilText(nextPayDate)} until payday
            </p>
          )}
        </div>

        {/* Breakdown - Compact horizontal layout on mobile */}
        <div className="pt-4 border-t border-white/20">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 text-center">
              <p className="text-primary-100 text-xs uppercase tracking-wide mb-0.5">Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(currentBalance)}</p>
            </div>
            <div className="text-2xl text-primary-200 font-light">−</div>
            <div className="flex-1 text-center">
              <p className="text-primary-100 text-xs uppercase tracking-wide mb-0.5">Bills Due</p>
              <p className="text-lg font-semibold">{formatCurrency(requiredReserve)}</p>
            </div>
            <div className="text-2xl text-primary-200 font-light">=</div>
            <div className="flex-1 text-center">
              <p className="text-primary-100 text-xs uppercase tracking-wide mb-0.5">Safe</p>
              <p className="text-lg font-semibold">{formatCurrency(safeAmount)}</p>
            </div>
          </div>
        </div>

        {/* Visual indicator bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'red' ? 'bg-red-400' :
                status === 'amber' ? 'bg-amber-400' :
                'bg-white'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, safePercentage))}%` }}
            />
          </div>
          <p className="text-xs text-primary-100 text-center mt-1">
            {safePercentage}% of your balance is safe to spend
          </p>
        </div>
      </div>
    </div>
  );
}
