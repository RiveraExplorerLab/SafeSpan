import { addPaycheck } from '../services/api';

export default function UpcomingPaydaysCard({ paydays = [], onUpdate }) {
  if (paydays.length === 0) return null;

  const handleAddPaycheck = async (payday) => {
    try {
      await addPaycheck(payday.sourceId);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to add paycheck:', err);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // Only show next 3 paydays
  const upcomingPaydays = paydays.slice(0, 3);

  return (
    <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
      <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-3">Upcoming Income</h3>
      <div className="space-y-2">
        {upcomingPaydays.map((payday, index) => (
          <div key={`${payday.sourceId}-${index}`} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{payday.sourceName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payday.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                +{formatCurrency(payday.amount)}
              </span>
              {!payday.autoAdd && (
                <button
                  onClick={() => handleAddPaycheck(payday)}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
