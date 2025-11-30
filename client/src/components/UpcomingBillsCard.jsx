import { formatCurrency, formatDate, daysUntil } from '../utils/format';

export default function UpcomingBillsCard({ bills }) {
  if (!bills || bills.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Upcoming Bills</h3>
        <p className="text-gray-500 text-sm">No bills due before payday</p>
      </div>
    );
  }

  const totalDue = bills
    .filter((b) => !b.isPaidThisPeriod)
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Upcoming Bills</h3>
        <span className="text-sm text-gray-500">
          {formatCurrency(totalDue)} due
        </span>
      </div>

      <ul className="space-y-3">
        {bills.map((bill) => (
          <li key={bill.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  bill.isPaidThisPeriod
                    ? 'bg-green-500'
                    : daysUntil(bill.dueDate) <= 3
                    ? 'bg-yellow-500'
                    : 'bg-gray-300'
                }`}
              />
              <div>
                <p className={`text-sm font-medium ${
                  bill.isPaidThisPeriod ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}>
                  {bill.name}
                </p>
                <p className="text-xs text-gray-500">
                  Due {formatDate(bill.dueDate)}
                  {bill.isAutoPay && ' • Auto-pay'}
                </p>
              </div>
            </div>
            <span className={`text-sm font-medium ${
              bill.isPaidThisPeriod ? 'text-gray-400' : 'text-gray-900'
            }`}>
              {formatCurrency(bill.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
