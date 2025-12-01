import { useEffect, useState, useCallback } from 'react';
import { useOverview } from '../hooks/useOverview';
import SetupPage from './SetupPage';
import Navigation from '../components/Navigation';
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
import UpcomingPaydaysCard from '../components/UpcomingPaydaysCard';
import SpendingTrendsCard from '../components/SpendingTrendsCard';
import BottomNav from '../components/BottomNav';
import FloatingActionButton from '../components/FloatingActionButton';
import { BillsView, TransactionsView, HistoryView, AccountsView } from './views';

// Loading screen shown after setup while waiting for data
function SetupLoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Setting up your account...</h2>
        <p className="text-gray-500 dark:text-gray-400">This will only take a moment</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error, refresh } = useOverview();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (error?.code === 'NOT_FOUND' && error?.message?.includes('settings')) {
      // If setup was just completed, keep showing loading and retry
      if (setupComplete) {
        const timer = setTimeout(() => {
          refresh();
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        // First time - show setup page
        setNeedsSetup(true);
      }
    } else if (data) {
      // Successfully got data
      setNeedsSetup(false);
      setSetupComplete(false);
    }
  }, [error, data, refresh, setupComplete]);

  const handleSetupComplete = useCallback(() => {
    setNeedsSetup(false);
    setSetupComplete(true);
    refresh();
  }, [refresh]);

  const navigateTo = (view) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      refresh();
    }
  };

  // Show loading screen after setup completes
  if (setupComplete && !data) {
    return <SetupLoadingScreen />;
  }

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
            onNavigate={navigateTo}
            showTransactionModal={showTransactionModal}
            setShowTransactionModal={setShowTransactionModal}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <Navigation currentView={currentView} onNavigate={navigateTo} />
      {renderContent()}
      {currentView === 'dashboard' && (
        <FloatingActionButton onClick={() => setShowTransactionModal(true)} />
      )}
      <BottomNav currentView={currentView} onNavigate={navigateTo} />
    </div>
  );
}

function DashboardContent({ data, loading, error, refresh, needsSetup, onNavigate, showTransactionModal, setShowTransactionModal }) {
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
    <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Dashboard Header with Quick Add */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          {data?.lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
              {loading && <span className="ml-2 text-primary-500">• Refreshing...</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowTransactionModal(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Transaction
        </button>
      </div>

      {/* Mobile: Show last updated only */}
      {data?.lastUpdated && (
        <p className="text-xs text-gray-400 mb-3 md:hidden">
          Updated {new Date(data.lastUpdated).toLocaleTimeString()}
          {loading && <span className="ml-2">• Refreshing...</span>}
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
        <div className="mt-4 sm:mt-6">
          <AccountsCard accounts={data.accounts} totalBalance={data.totalBalance} />
        </div>
      )}

      {/* Upcoming Paydays */}
      {data?.upcomingPaydays?.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <UpcomingPaydaysCard paydays={data.upcomingPaydays} onUpdate={refresh} />
        </div>
      )}

      {/* Mobile modal - controlled by FAB */}
      <QuickAddTransaction 
        onSuccess={refresh} 
        accounts={data?.accounts || []} 
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        showTrigger={false}
      />

      <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <div>
          {data?.upcomingBills?.length > 0 ? (
            <UpcomingBillsCard bills={data.upcomingBills} onUpdate={refresh} />
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
        <div className="mt-4 sm:mt-6">
          <BudgetProgressCard
            spendingByCategory={data?.currentPeriod?.spendingByCategory || {}}
            categoryBudgets={data.categoryBudgets}
            onManageBudgets={() => onNavigate('settings')}
          />
        </div>
      )}

      {/* Savings Goals */}
      <div className="mt-4 sm:mt-6">
        <SavingsGoalsCard goals={data?.savingsGoals || []} accounts={data?.accounts || []} onUpdate={refresh} />
      </div>

      {/* Spending Trends */}
      <div className="mt-4 sm:mt-6">
        <SpendingTrendsCard />
      </div>

      <div className="mt-4 sm:mt-6">
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

      <div className="mt-4 sm:mt-6 text-center pb-4">
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
