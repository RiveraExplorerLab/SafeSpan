import { formatCurrency } from '../utils/format';

export default function AccountsCard({ accounts, totalBalance }) {
  if (!accounts || accounts.length === 0 || accounts.length === 1) {
    return null;
  }

  const bankAccounts = accounts.filter(a => a.type !== 'credit_card');
  const creditCards = accounts.filter(a => a.type === 'credit_card');
  
  const bankTotal = bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const creditOwed = creditCards.reduce((sum, a) => sum + a.currentBalance, 0);

  const getAccountColor = (type) => {
    switch (type) {
      case 'checking': return 'bg-primary-500';
      case 'savings': return 'bg-blue-500';
      case 'credit_card': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'checking': return 'Checking';
      case 'savings': return 'Savings';
      case 'credit_card': return 'Credit';
      default: return type;
    }
  };

  return (
    <div className="card card-compact">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Accounts</h3>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(bankTotal)} <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">cash</span>
        </span>
      </div>

      <div className="space-y-2">
        {bankAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getAccountColor(account.type)}`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{account.name}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">({getTypeLabel(account.type)})</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {formatCurrency(account.currentBalance)}
            </span>
          </div>
        ))}

        {creditCards.length > 0 && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Credit Cards</span>
                <span className="text-xs text-red-500 font-medium">
                  -{formatCurrency(creditOwed)}
                </span>
              </div>
            </div>
            {creditCards.map((card) => {
              const utilization = card.creditLimit > 0 
                ? Math.round((card.currentBalance / card.creditLimit) * 100) 
                : 0;
              const utilizationColor = utilization > 30 
                ? utilization > 50 
                  ? 'bg-red-500' 
                  : 'bg-amber-500'
                : 'bg-green-500';
              
              return (
                <div key={card.id} className="py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getAccountColor(card.type)}`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{card.name}</span>
                    </div>
                    <span className={`font-medium text-sm ${card.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {card.currentBalance > 0 ? '-' : ''}{formatCurrency(Math.abs(card.currentBalance))}
                    </span>
                  </div>
                  {/* Utilization bar */}
                  <div className="flex items-center gap-2 mt-1 ml-4">
                    <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${utilizationColor} transition-all`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{utilization}%</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Net position */}
      {creditCards.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Worth</span>
            <span className={`font-semibold ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
