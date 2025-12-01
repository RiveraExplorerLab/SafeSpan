/**
 * Analytics Routes
 * GET /api/analytics/spending-trends - Returns spending data over time
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/analytics/spending-trends
 * Returns spending by category over the last N pay periods
 */
router.get('/spending-trends', async (req, res, next) => {
  try {
    const { userId } = req;
    const periods = parseInt(req.query.periods) || 6;

    // Fetch pay periods
    const periodsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('payPeriods')
      .orderBy('periodStart', 'desc')
      .limit(periods)
      .get();

    if (periodsSnapshot.empty) {
      return res.json(successResponse({
        periods: [],
        categoryTotals: {},
        periodTotals: [],
      }));
    }

    const payPeriods = periodsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all transactions for these periods
    const periodIds = payPeriods.map(p => p.id);
    
    // Fetch transactions in batches (Firestore 'in' query limit is 10)
    const allTransactions = [];
    for (let i = 0; i < periodIds.length; i += 10) {
      const batch = periodIds.slice(i, i + 10);
      const txnSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('payPeriodId', 'in', batch)
        .get();
      
      txnSnapshot.docs.forEach(doc => {
        allTransactions.push({ id: doc.id, ...doc.data() });
      });
    }

    // Calculate spending by category per period
    const spendingByPeriod = {};
    const categoryTotals = {};

    payPeriods.forEach(period => {
      spendingByPeriod[period.id] = {
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        categories: {},
        total: 0,
      };
    });

    allTransactions.forEach(txn => {
      // Only count expenses (debit_purchase)
      if (txn.type !== 'debit_purchase') return;
      
      const category = txn.category || 'Other';
      const amount = txn.amount || 0;
      const periodId = txn.payPeriodId;

      if (spendingByPeriod[periodId]) {
        // Add to period's category
        if (!spendingByPeriod[periodId].categories[category]) {
          spendingByPeriod[periodId].categories[category] = 0;
        }
        spendingByPeriod[periodId].categories[category] += amount;
        spendingByPeriod[periodId].total += amount;

        // Add to overall category totals
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += amount;
      }
    });

    // Format for frontend (reverse to chronological order)
    const periodData = payPeriods
      .map(p => ({
        id: p.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        ...spendingByPeriod[p.id],
      }))
      .reverse();

    // Calculate averages
    const totalSpending = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);
    const avgPerPeriod = periodData.length > 0 ? totalSpending / periodData.length : 0;

    res.json(successResponse({
      periods: periodData,
      categoryTotals,
      totalSpending,
      avgPerPeriod,
      periodCount: periodData.length,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
