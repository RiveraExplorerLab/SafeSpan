import { formatCurrency } from '../utils/format';
import { CATEGORIES, getCategoryEmoji } from '../utils/categories';

export default function BudgetProgressCard({ spendingByCategory = {}, categoryBudgets = {}, onManageBudgets }) {
  // Only show categories that have budgets set
  const budgetedCategories = Object.entries(categoryBudgets)
    .filter(([_, limit]) => limit > 0)
    .map(([category, limit]) => {
      const spent = spendingByCategory[category] || 0;
      const percentage = Math.min(100, Math.round((spent / limit) * 100));
      const remaining = limit - spent;
      const isOver = spent > limit;
      const isWarning = percentage >= 80 && !isOver;
      
      return {
        category,
        label: CATEGORIES.find(c => c.value === category)?.label || category,
        emoji: getCategoryEmoji(category),
        limit,
        spent,
        percentage,
        remaining,
        isOver,
        isWarning,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  if (budgetedCategories.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Budget Tracking</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          No budgets set yet. Set spending limits to track your progress.
        </p>
        <button
          onClick={onManageBudgets}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Set Up Budgets →
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Budget Tracking</h3>
        <button
          onClick={onManageBudgets}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Edit
        </button>
      </div>

      <div className="space-y-4">
        {budgetedCategories.map((cat) => (
          <div key={cat.category}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span>{cat.emoji}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.label}</span>
              </div>
              <span className={`text-sm font-medium ${
                cat.isOver ? 'text-red-600' : cat.isWarning ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {formatCurrency(cat.spent)} / {formatCurrency(cat.limit)}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  cat.isOver ? 'bg-red-500' : cat.isWarning ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
              />
            </div>
            
            {/* Status text */}
            <p className={`text-xs mt-1 ${
              cat.isOver ? 'text-red-600' : cat.isWarning ? 'text-yellow-600' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {cat.isOver 
                ? `${formatCurrency(Math.abs(cat.remaining))} over budget`
                : `${formatCurrency(cat.remaining)} remaining`
              }
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
