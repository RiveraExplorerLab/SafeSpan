import { formatCurrency } from '../utils/format';

export default function AccountsCard({ accounts, totalBalance }) {
  if (!accounts || accounts.length === 0) {
    return null;
  }

  if (accounts.length === 1) {
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
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Accounts</h3>
        <span className="text-sm text-gray-500">
          Cash: {formatCurrency(bankTotal)}
        </span>
      </div>

      <div className="space-y-3">
        {bankAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getAccountColor(account.type)}`} />
              <span className="text-sm text-gray-700">{account.name}</span>
              <span className="text-xs text-gray-400">({getTypeLabel(account.type)})</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatCurrency(account.currentBalance)}
            </span>
          </div>
        ))}

        {creditCards.length > 0 && (
          <>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Credit Cards</span>
                <span className="text-xs text-gray-500">
                  Owed: {formatCurrency(creditOwed)}
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
                  : 'bg-yellow-500'
                : 'bg-green-500';
              
              return (
                <div key={card.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getAccountColor(card.type)}`} />
                      <span className="text-sm text-gray-700">{card.name}</span>
                    </div>
                    <span className={`font-medium ${card.currentBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {card.currentBalance > 0 ? '-' : ''}{formatCurrency(Math.abs(card.currentBalance))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${utilizationColor} transition-all`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{utilization}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 pl-4">
                    <span>Available: {formatCurrency(card.creditLimit - card.currentBalance)}</span>
                    <span>Limit: {formatCurrency(card.creditLimit)}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {creditCards.length > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Net Position</span>
            <span className={`font-semibold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
