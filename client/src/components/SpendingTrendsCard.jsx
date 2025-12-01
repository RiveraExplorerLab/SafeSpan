import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchSpendingTrends } from '../services/api';
import { CATEGORIES } from '../utils/categories';

const CATEGORY_COLORS = {
  'Food': '#f97316',
  'Transport': '#3b82f6',
  'Entertainment': '#a855f7',
  'Shopping': '#ec4899',
  'Utilities': '#6b7280',
  'Health': '#10b981',
  'Subscriptions': '#8b5cf6',
  'Other': '#94a3b8',
};

export default function SpendingTrendsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('total'); // 'total' or 'category'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchSpendingTrends(6);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatPeriodLabel = (periodStart) => {
    const date = new Date(periodStart + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.periods.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Spending Trends</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Not enough data yet. Spending trends will appear after a few pay periods.
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.periods.map(period => ({
    name: formatPeriodLabel(period.periodStart),
    total: period.total,
    ...period.categories,
  }));

  // Get top categories for legend
  const sortedCategories = Object.entries(data.categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spending Trends</h3>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setView('total')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              view === 'total'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Total
          </button>
          <button
            onClick={() => setView('category')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              view === 'category'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            By Category
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(data.totalSpending)}
          </p>
          <p className="text-xs text-gray-400">Last {data.periodCount} periods</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg per Period</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(data.avgPerPeriod)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {view === 'total' ? (
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill="#0d9488" />
                ))}
              </Bar>
            ) : (
              sortedCategories.map(([category]) => (
                <Bar 
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={CATEGORY_COLORS[category] || '#94a3b8'}
                />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Legend (for stacked view) */}
      {view === 'category' && (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {sortedCategories.map(([category, total]) => {
            const cat = CATEGORIES.find(c => c.value.toLowerCase() === category.toLowerCase());
            return (
              <div key={category} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: CATEGORY_COLORS[category] || '#94a3b8' }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {cat?.emoji} {category}
                </span>
                <span className="text-xs text-gray-400">
                  ({formatCurrency(total)})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
