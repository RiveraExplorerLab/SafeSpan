/**
 * Overview Route
 * GET /api/overview - Returns complete dashboard state
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { calculatePayPeriod, getOrCreatePayPeriod } from '../services/payPeriod.js';
import { today, parseDate, formatDate, addDays, normalizeDay, isOnOrBefore, isAfter } from '../utils/dates.js';

const router = Router();

/**
 * GET /api/overview
 * Returns dashboard data: accounts, pay info, upcoming bills, safe-to-spend, recent transactions
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const userRef = db.collection('users').doc(userId);

    // Fetch settings
    const settingsDoc = await userRef.collection('settings').doc('main').get();
    if (!settingsDoc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'User settings not found. Please complete setup.')
      );
    }
    const settings = settingsDoc.data();

    // Fetch ALL accounts
    const accountsSnapshot = await userRef.collection('accounts').get();
    const accounts = accountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (accounts.length === 0) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'No accounts found.')
      );
    }

    // Separate accounts by type
    const bankAccounts = accounts.filter(a => a.type !== 'credit_card');
    const creditCards = accounts.filter(a => a.type === 'credit_card');

    // Find primary account
    const primaryAccount = accounts.find(a => a.id === settings.primaryAccountId) || bankAccounts[0] || accounts[0];

    // Calculate totals
    const cashBalance = bankAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const creditOwed = creditCards.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalCreditLimit = creditCards.reduce((sum, a) => sum + (a.creditLimit || 0), 0);
    const totalCreditAvailable = totalCreditLimit - creditOwed;
    const netWorth = cashBalance - creditOwed; // Cash minus debt

    // Calculate current pay period
    const { periodStart, periodEnd, nextPayDate } = calculatePayPeriod(
      settings.payFrequency,
      settings.payAnchorDate,
      settings.semimonthlyDays
    );

    // Get or create pay period summary
    const currentPeriod = await getOrCreatePayPeriod(userId, periodStart, periodStart, periodEnd);

    // Fetch active bills
    const billsSnapshot = await userRef
      .collection('bills')
      .where('isActive', '==', true)
      .orderBy('dueDay', 'asc')
      .get();

    const todayStr = today();
    const todayDate = parseDate(todayStr);
    const nextPayDateObj = parseDate(nextPayDate);

    // Calculate upcoming bills (due between today and next pay date)
    const upcomingBills = [];
    let requiredReserve = 0;

    billsSnapshot.docs.forEach((doc) => {
      const bill = { id: doc.id, ...doc.data() };
      
      // Calculate next due date for this bill
      const dueDateObj = getNextDueDate(bill, todayStr);
      const dueDate = formatDate(dueDateObj);

      // Check if bill is due before next paycheck
      if (isOnOrBefore(dueDateObj, nextPayDateObj)) {
        // Check if already paid this period
        const isPaidThisPeriod = bill.lastPaidDate && isOnOrBefore(periodStart, bill.lastPaidDate);
        
        upcomingBills.push({
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          dueDate,
          isPaidThisPeriod,
          isAutoPay: bill.isAutoPay || false,
        });

        // Only add to reserve if not yet paid
        if (!isPaidThisPeriod) {
          requiredReserve += bill.amount;
        }
      }
    });

    // Calculate safe-to-spend (based on primary account, should be a bank account)
    const safeAmount = Math.max(0, primaryAccount.currentBalance - requiredReserve);

    // Fetch savings goals
    const goalsSnapshot = await userRef
      .collection('savingsGoals')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const savingsGoals = goalsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    // Fetch current period transactions for spending by category
    const periodTransactionsSnapshot = await userRef
      .collection('transactions')
      .where('payPeriodId', '==', periodStart)
      .get();

    const spendingByCategory = {};
    periodTransactionsSnapshot.docs.forEach((doc) => {
      const txn = doc.data();
      if (txn.type === 'debit_purchase' && txn.category) {
        spendingByCategory[txn.category] = (spendingByCategory[txn.category] || 0) + txn.amount;
      }
    });

    // Fetch recent transactions (last 7 days)
    const sevenDaysAgo = formatDate(addDays(todayDate, -7));
    const transactionsSnapshot = await userRef
      .collection('transactions')
      .where('date', '>=', sevenDaysAgo)
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    const recentTransactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    // Build response
    const overview = {
      // All accounts with full details
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currentBalance: a.currentBalance,
        creditLimit: a.creditLimit || null,
        apr: a.apr || null,
        dueDay: a.dueDay || null,
      })),
      // Primary account (for backwards compatibility)
      account: {
        id: primaryAccount.id,
        name: primaryAccount.name,
        type: primaryAccount.type,
        currentBalance: primaryAccount.currentBalance,
      },
      // Balance totals
      totalBalance: netWorth, // Net worth (cash - debt)
      cashBalance, // Total in bank accounts
      creditOwed, // Total credit card debt
      totalCreditLimit, // Total credit limits
      totalCreditAvailable, // Available credit
      // Pay schedule
      paySchedule: {
        frequency: settings.payFrequency,
        netPayAmount: settings.netPayAmount,
        nextPayDate,
      },
      currentPeriod: {
        id: currentPeriod.id,
        periodStart: currentPeriod.periodStart,
        periodEnd: currentPeriod.periodEnd,
        incomeTotal: currentPeriod.incomeTotal,
        billsTotal: currentPeriod.billsTotal,
        discretionaryTotal: currentPeriod.discretionaryTotal,
        netChange: currentPeriod.netChange,
        spendingByCategory,
      },
      categoryBudgets: settings.categoryBudgets || {},
      savingsGoals,
      upcomingBills,
      safeToSpend: {
        currentBalance: primaryAccount.currentBalance,
        requiredReserve,
        safeAmount,
      },
      recentTransactions,
      lastUpdated: new Date().toISOString(),
    };

    res.json(successResponse(overview));
  } catch (error) {
    next(error);
  }
});

/**
 * Get the next due date for a bill based on its frequency and due day
 * @param {Object} bill
 * @param {string} todayStr - Today's date as ISO string
 * @returns {Date}
 */
function getNextDueDate(bill, todayStr) {
  const todayDate = parseDate(todayStr);
  const year = todayDate.getUTCFullYear();
  const month = todayDate.getUTCMonth() + 1;
  const dayOfMonth = todayDate.getUTCDate();

  // For now, only monthly bills are supported
  if (bill.frequency === 'monthly') {
    const normalizedDueDay = normalizeDay(bill.dueDay, year, month);
    
    if (dayOfMonth <= normalizedDueDay) {
      // Due date is this month
      return new Date(Date.UTC(year, month - 1, normalizedDueDay));
    } else {
      // Due date is next month
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const nextNormalizedDueDay = normalizeDay(bill.dueDay, nextYear, nextMonth);
      return new Date(Date.UTC(nextYear, nextMonth - 1, nextNormalizedDueDay));
    }
  }

  // Default: return today (shouldn't happen with valid data)
  return todayDate;
}

export default router;
