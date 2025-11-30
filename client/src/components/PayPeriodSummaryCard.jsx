import { formatCurrency, formatFullDate } from '../utils/format';
import { getCategoryEmoji, CATEGORIES } from '../utils/categories';

const CATEGORY_COLORS = {
  food: 'bg-orange-400',
  transport: 'bg-blue-400',
  entertainment: 'bg-purple-400',
  shopping: 'bg-pink-400',
  utilities: 'bg-yellow-400',
  health: 'bg-red-400',
  subscriptions: 'bg-indigo-400',
  other: 'bg-gray-400',
};

export default function PayPeriodSummaryCard({ period }) {
  const { periodStart, periodEnd, incomeTotal, billsTotal, discretionaryTotal, netChange, spendingByCategory } = period;

  const categoryData = Object.entries(spendingByCategory || {})
    .map(([category, amount]) => ({
      category,
      amount,
      label: CATEGORIES.find(c => c.value === category)?.label || category,
      emoji: getCategoryEmoji(category),
      color: CATEGORY_COLORS[category] || 'bg-gray-400',
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalCategorized = categoryData.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-1">This Pay Period</h3>
      <p className="text-xs text-gray-500 mb-4">
        {formatFullDate(periodStart)} – {formatFullDate(periodEnd)}
      </p>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Income</span>
          <span className="font-medium text-green-600">
            +{formatCurrency(incomeTotal)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Bills</span>
          <span className="font-medium text-gray-900">
            −{formatCurrency(billsTotal)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Spending</span>
          <span className="font-medium text-gray-900">
            −{formatCurrency(discretionaryTotal)}
          </span>
        </div>

        <div className="border-t border-gray-200 pt-3 flex justify-between">
          <span className="font-medium text-gray-900">Net Change</span>
          <span className={`font-semibold ${
            netChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
          </span>
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Spending by Category</p>
          
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex mb-3">
            {categoryData.map((cat) => (
              <div
                key={cat.category}
                className={`${cat.color} first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${(cat.amount / totalCategorized) * 100}%` }}
                title={`${cat.label}: ${formatCurrency(cat.amount)}`}
              />
            ))}
          </div>

          <div className="space-y-1.5">
            {categoryData.slice(0, 4).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span>{cat.emoji}</span>
                  <span className="text-gray-600">{cat.label}</span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(cat.amount)}</span>
              </div>
            ))}
            {categoryData.length > 4 && (
              <p className="text-xs text-gray-400">+{categoryData.length - 4} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
