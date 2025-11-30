import { daysUntil, daysUntilText, formatCurrency } from '../utils/format';

export default function AlertBanner({ upcomingBills = [], safeToSpend, nextPayDate }) {
  const alerts = [];

  // Check for payday today or tomorrow
  if (nextPayDate) {
    const daysToPayday = daysUntil(nextPayDate);
    if (daysToPayday === 0) {
      alerts.push({
        type: 'success',
        icon: '🎉',
        message: "It's payday! Your pay period resets today.",
      });
    } else if (daysToPayday === 1) {
      alerts.push({
        type: 'info',
        icon: '💰',
        message: 'Payday is tomorrow!',
      });
    }
  }

  // Check for bills due today or tomorrow
  const urgentBills = upcomingBills.filter(
    (b) => !b.isPaidThisPeriod && daysUntil(b.dueDate) <= 1
  );
  if (urgentBills.length > 0) {
    const billNames = urgentBills.map((b) => b.name).join(', ');
    const total = urgentBills.reduce((sum, b) => sum + b.amount, 0);
    alerts.push({
      type: 'warning',
      icon: '⚠️',
      message: urgentBills.length === 1 
        ? `${billNames} (${formatCurrency(total)}) is due ${daysUntil(urgentBills[0].dueDate) === 0 ? 'today' : 'tomorrow'}!`
        : `${urgentBills.length} bills (${formatCurrency(total)}) due within 24 hours`,
    });
  }

  // Check for low balance
  if (safeToSpend && safeToSpend.safeAmount < 50) {
    alerts.push({
      type: 'danger',
      icon: '🔴',
      message: safeToSpend.safeAmount <= 0
        ? 'No safe spending available - bills exceed balance'
        : `Low safe-to-spend: only ${formatCurrency(safeToSpend.safeAmount)} available`,
    });
  }

  // Check for bills due in next 3 days
  const soonBills = upcomingBills.filter(
    (b) => !b.isPaidThisPeriod && daysUntil(b.dueDate) > 1 && daysUntil(b.dueDate) <= 3
  );
  if (soonBills.length > 0 && alerts.length === 0) {
    const total = soonBills.reduce((sum, b) => sum + b.amount, 0);
    alerts.push({
      type: 'info',
      icon: '📅',
      message: `${soonBills.length} bill${soonBills.length > 1 ? 's' : ''} (${formatCurrency(total)}) due in the next 3 days`,
    });
  }

  if (alerts.length === 0) return null;

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColors = {
    success: 'text-green-800',
    warning: 'text-yellow-800',
    danger: 'text-red-800',
    info: 'text-blue-800',
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`${bgColors[alert.type]} ${textColors[alert.type]} border rounded-lg px-4 py-3 text-sm flex items-center gap-2 animate-fadeIn`}
        >
          <span>{alert.icon}</span>
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  );
}
