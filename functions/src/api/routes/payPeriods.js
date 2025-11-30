/**
 * Pay Periods Route
 * GET /api/pay-periods
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/pay-periods
 * Returns pay period summaries
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { limit = '3', before } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 3, 12);

    let query = db
      .collection('users')
      .doc(userId)
      .collection('payPeriods')
      .orderBy('periodStart', 'desc');

    if (before) {
      query = query.where('periodStart', '<', before);
    }

    query = query.limit(limitNum);

    const snapshot = await query.get();

    const periods = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse(periods));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pay-periods/:periodId
 * Returns a single pay period with its transactions
 */
router.get('/:periodId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { periodId } = req.params;

    const userRef = db.collection('users').doc(userId);

    // Get period summary
    const periodDoc = await userRef.collection('payPeriods').doc(periodId).get();

    if (!periodDoc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Pay period not found')
      );
    }

    const period = {
      id: periodDoc.id,
      ...periodDoc.data(),
      createdAt: periodDoc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: periodDoc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    // Get transactions for this period
    const txnSnapshot = await userRef
      .collection('transactions')
      .where('payPeriodId', '==', periodId)
      .orderBy('date', 'desc')
      .get();

    const transactions = txnSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse({
      period,
      transactions,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
