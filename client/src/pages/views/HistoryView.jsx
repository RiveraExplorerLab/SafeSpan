import { useState, useEffect } from 'react';
import { SkeletonBillCard } from '../../components/Skeleton';
import { EmptyPayPeriodHistory } from '../../components/EmptyState';

export default function HistoryView() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodDetail, setPeriodDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadPeriods(); }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const { fetchPayPeriods } = await import('../../services/api');
      const data = await fetchPayPeriods({ limit: 12 });
      setPeriods(data);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const loadPeriodDetail = async (periodId) => {
    if (selectedPeriod === periodId) {
      setSelectedPeriod(null);
      setPeriodDetail(null);
      return;
    }
    setSelectedPeriod(periodId);
    setDetailLoading(true);
    try {
      const { fetchPayPeriod } = await import('../../services/api');
      setPeriodDetail(await fetchPayPeriod(periodId));
    } catch (err) { setError(err.message); } 
    finally { setDetailLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const formatDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatFullDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonBillCard key={i} />)}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Pay Period History</h2>
      {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      
      {periods.length === 0 ? (
        <EmptyPayPeriodHistory />
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <div key={period.id} className="card transition-shadow hover:shadow-md">
              <button onClick={() => loadPeriodDetail(period.id)} className="w-full text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{formatFullDate(period.periodStart)} – {formatFullDate(period.periodEnd)}</p>
                    <p className="text-sm text-gray-500">{period.transactionCount} transaction{period.transactionCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold ${period.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {period.netChange >= 0 ? '+' : ''}{formatCurrency(period.netChange)}
                    </span>
                    <span className={`text-gray-400 transition-transform ${selectedPeriod === period.id ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
              </button>

              {selectedPeriod === period.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                      Loading...
                    </div>
                  ) : periodDetail ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500">Income</p>
                          <p className="font-medium text-green-600">+{formatCurrency(periodDetail.period.incomeTotal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Bills</p>
                          <p className="font-medium text-gray-900">−{formatCurrency(periodDetail.period.billsTotal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Spending</p>
                          <p className="font-medium text-gray-900">−{formatCurrency(periodDetail.period.discretionaryTotal)}</p>
                        </div>
                      </div>
                      {periodDetail.transactions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Transactions</p>
                          {periodDetail.transactions.slice(0, 10).map((txn) => (
                            <div key={txn.id} className="flex items-center justify-between text-sm py-1">
                              <div>
                                <span className="text-gray-900">{txn.description}</span>
                                <span className="text-gray-400 ml-2">{formatDate(txn.date)}</span>
                              </div>
                              <span className={txn.type === 'income' ? 'text-green-600' : 'text-gray-900'}>
                                {txn.type === 'income' ? '+' : '−'}{formatCurrency(txn.amount)}
                              </span>
                            </div>
                          ))}
                          {periodDetail.transactions.length > 10 && (
                            <p className="text-xs text-gray-500">+{periodDetail.transactions.length - 10} more</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
