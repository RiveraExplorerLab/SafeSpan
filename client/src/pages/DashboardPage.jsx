import { useEffect, useState, useRef, useCallback } from 'react';
import { useOverview } from '../hooks/useOverview';
import SetupPage from './SetupPage';
import Navigation from '../components/Navigation';
import OfflineBanner from '../components/OfflineBanner';
import { DashboardSkeleton } from '../components/Skeleton';
import { EmptyRecentTransactions, EmptyUpcomingBills } from '../components/EmptyState';
import SafeToSpendCard from '../components/SafeToSpendCard';
import AccountsCard from '../components/AccountsCard';
import UpcomingBillsCard from '../components/UpcomingBillsCard';
import RecentTransactionsCard from '../components/RecentTransactionsCard';
import PayPeriodSummaryCard from '../components/PayPeriodSummaryCard';
import QuickAddTransaction from '../components/QuickAddTransaction';
import AlertBanner from '../components/AlertBanner';
import BudgetProgressCard from '../components/BudgetProgressCard';
import SavingsGoalsCard from '../components/SavingsGoalsCard';
import { BillsView, TransactionsView, HistoryView, AccountsView } from './views';

export default function DashboardPage() {
  const { 
    data, 
    loading, 
    error, 
    refresh,
    fromCache,
    cacheTime,
    online,
    queuedCount,
    syncing,
    sync
  } = useOverview();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const justCompletedSetup = useRef(false);
  const retryCount = useRef(0);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (error?.code === 'NOT_FOUND' && error?.message?.includes('settings')) {
      // If we just completed setup, retry instead of showing setup again
      if (justCompletedSetup.current && retryCount.current < 5) {
        retryCount.current += 1;
        const delay = Math.min(1000 * retryCount.current, 3000); // 1s, 2s, 3s, 3s, 3s
        console.log(`Setup data not ready, retrying in ${delay}ms (attempt ${retryCount.current}/5)...`);
        setTimeout(() => {
          refresh();
        }, delay);
      } else {
        setNeedsSetup(true);
        justCompletedSetup.current = false;
        retryCount.current = 0;
      }
    } else if (data) {
      // Successfully got data, reset flags
      justCompletedSetup.current = false;
      retryCount.current = 0;
    }
  }, [error, data, refresh]);

  const handleSetupComplete = useCallback(() => {
    setNeedsSetup(false);
    justCompletedSetup.current = true;
    retryCount.current = 0;
    refresh();
  }, [refresh]);

  const navigateTo = (view) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      refresh();
    }
  };

  if (needsSetup) {
    return <SetupPage onComplete={handleSetupComplete} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'bills':
        return <BillsView onRefresh={refresh} />;
      case 'transactions':
        return <TransactionsView />;
      case 'settings':
        return <AccountsView />;
      case 'history':
        return <HistoryView />;
      default:
        return (
          <DashboardContent 
            data={data} 
            loading={loading} 
            error={error}
            refresh={refresh}
            needsSetup={needsSetup}
            queuedCount={queuedCount}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentView={currentView} onNavigate={navigateTo} />
      <OfflineBanner 
        online={online}
        queuedCount={queuedCount}
        syncing={syncing}
        onSync={sync}
        fromCache={fromCache}
        cacheTime={cacheTime}
      />
      {renderContent()}
    </div>
  );
}

function DashboardContent({ data, loading, error, refresh, needsSetup, queuedCount, onNavigate }) {
  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data && !needsSetup) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error.message}</p>
          <button onClick={refresh} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {data?.lastUpdated && (
        <p className="text-xs text-gray-400 mb-4">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
          {loading && <span className="ml-2 inline-flex items-center gap-1"><span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>Refreshing...</span>}
        </p>
      )}

      {/* Alert Banner for urgent notifications */}
      <AlertBanner 
        upcomingBills={data?.upcomingBills || []}
        safeToSpend={data?.safeToSpend}
        nextPayDate={data?.paySchedule?.nextPayDate}
      />

      {data?.safeToSpend && (
        <SafeToSpendCard
          safeToSpend={data.safeToSpend}
          nextPayDate={data.paySchedule?.nextPayDate}
        />
      )}

      {data?.accounts?.length > 1 && (
        <div className="mt-6">
          <AccountsCard accounts={data.accounts} totalBalance={data.totalBalance} />
        </div>
      )}

      <div className="mt-6">
        <QuickAddTransaction onSuccess={refresh} accounts={data?.accounts || []} />
        {queuedCount > 0 && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            {queuedCount} transaction{queuedCount !== 1 ? 's' : ''} pending sync
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          {data?.upcomingBills?.length > 0 ? (
            <UpcomingBillsCard bills={data.upcomingBills} />
          ) : (
            <EmptyUpcomingBills />
          )}
        </div>

        <div>
          {data?.currentPeriod && (
            <PayPeriodSummaryCard period={data.currentPeriod} />
          )}
          <button
            onClick={() => onNavigate('history')}
            className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View Pay Period History →
          </button>
        </div>
      </div>

      {/* Budget Progress - show if any budgets set */}
      {data?.categoryBudgets && Object.keys(data.categoryBudgets).length > 0 && (
        <div className="mt-6">
          <BudgetProgressCard
            spendingByCategory={data?.currentPeriod?.spendingByCategory || {}}
            categoryBudgets={data.categoryBudgets}
            onManageBudgets={() => onNavigate('settings')}
          />
        </div>
      )}

      {/* Savings Goals */}
      <div className="mt-6">
        <SavingsGoalsCard goals={data?.savingsGoals || []} accounts={data?.accounts || []} onUpdate={refresh} />
      </div>

      <div className="mt-6">
        {data?.recentTransactions?.length > 0 ? (
          <RecentTransactionsCard 
            transactions={data.recentTransactions}
            accounts={data?.accounts || []}
            onDelete={refresh}
          />
        ) : (
          <EmptyRecentTransactions />
        )}
      </div>

      <div className="mt-6 text-center pb-4">
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-secondary inline-flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </button>
      </div>
    </main>
  );
}
