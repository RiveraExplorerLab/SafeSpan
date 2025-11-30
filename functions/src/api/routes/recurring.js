/**
 * Recurring Transactions Route
 * CRUD for /api/recurring
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

const VALID_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];
const VALID_TYPES = ['income', 'debit_purchase'];

/**
 * Calculate next due date based on frequency
 */
function calculateNextDueDate(frequency, fromDate) {
  const date = new Date(fromDate + 'T00:00:00Z');
  
  switch (frequency) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'biweekly':
      date.setUTCDate(date.getUTCDate() + 14);
      break;
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * GET /api/recurring
 * Returns all recurring transactions
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('recurringTransactions')
      .orderBy('nextDueDate', 'asc')
      .get();

    const recurring = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse(recurring));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/recurring
 * Creates a new recurring transaction
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { description, amount, type, frequency, startDate, accountId } = req.body;

    // Validation
    if (!description || typeof description !== 'string') {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'description is required')
      );
    }

    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'amount must be a positive number')
      );
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', `type must be one of: ${VALID_TYPES.join(', ')}`)
      );
    }

    if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`)
      );
    }

    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'startDate is required in YYYY-MM-DD format')
      );
    }

    const userRef = db.collection('users').doc(userId);
    let resolvedAccountId = accountId;
    
    if (!accountId) {
      const settingsDoc = await userRef.collection('settings').doc('main').get();
      if (settingsDoc.exists) {
        resolvedAccountId = settingsDoc.data().primaryAccountId;
      }
    }

    if (resolvedAccountId) {
      const accountDoc = await userRef.collection('accounts').doc(resolvedAccountId).get();
      if (!accountDoc.exists) {
        return res.status(400).json(
          errorResponse('NOT_FOUND', 'Account not found')
        );
      }
    }

    const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const recurringData = {
      id,
      description: description.trim(),
      amount,
      type,
      frequency,
      startDate,
      nextDueDate: startDate,
      accountId: resolvedAccountId || null,
      isActive: true,
      lastProcessedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRef.collection('recurringTransactions').doc(id).set(recurringData);

    res.status(201).json(successResponse({
      ...recurringData,
      createdAt: recurringData.createdAt.toISOString(),
      updatedAt: recurringData.updatedAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/recurring/:id
 * Updates a recurring transaction
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { description, amount, type, frequency, accountId, isActive } = req.body;

    const userRef = db.collection('users').doc(userId);
    const docRef = userRef.collection('recurringTransactions').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Recurring transaction not found')
      );
    }

    const updates = { updatedAt: new Date() };

    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'description must be a non-empty string')
        );
      }
      updates.description = description.trim();
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'amount must be a positive number')
        );
      }
      updates.amount = amount;
    }

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', `type must be one of: ${VALID_TYPES.join(', ')}`)
        );
      }
      updates.type = type;
    }

    if (frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(frequency)) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`)
        );
      }
      updates.frequency = frequency;
    }

    if (accountId !== undefined) {
      if (accountId) {
        const accountDoc = await userRef.collection('accounts').doc(accountId).get();
        if (!accountDoc.exists) {
          return res.status(400).json(
            errorResponse('NOT_FOUND', 'Account not found')
          );
        }
      }
      updates.accountId = accountId || null;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    await docRef.update(updates);

    const updated = await docRef.get();
    const data = updated.data();

    res.json(successResponse({
      id: updated.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/recurring/:id
 * Deletes a recurring transaction
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('recurringTransactions')
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Recurring transaction not found')
      );
    }

    await docRef.delete();

    res.json(successResponse({ deleted: true, id }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/recurring/process
 * Process all due recurring transactions and create actual transactions
 */
router.post('/process', async (req, res, next) => {
  try {
    const { userId } = req;
    const today = new Date().toISOString().split('T')[0];

    const userRef = db.collection('users').doc(userId);
    
    // Get all active recurring transactions due today or earlier
    const snapshot = await userRef
      .collection('recurringTransactions')
      .where('isActive', '==', true)
      .where('nextDueDate', '<=', today)
      .get();

    if (snapshot.empty) {
      return res.json(successResponse({ processed: 0, transactions: [] }));
    }

    // Get settings for pay period calculation
    const settingsDoc = await userRef.collection('settings').doc('main').get();
    if (!settingsDoc.exists) {
      return res.status(400).json(
        errorResponse('NOT_FOUND', 'Settings not found')
      );
    }

    const settings = settingsDoc.data();
    const { calculatePayPeriodDates } = await import('../utils/payPeriod.js');
    const { periodStart, periodEnd } = calculatePayPeriodDates(
      settings.payFrequency,
      settings.payAnchorDate,
      today,
      settings.semimonthlyDays
    );

    const createdTransactions = [];
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const recurring = doc.data();
      let currentDueDate = recurring.nextDueDate;

      // Process all missed dates up to today
      while (currentDueDate <= today) {
        // Create the transaction
        const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const txnRef = userRef.collection('transactions').doc(txnId);

        const transaction = {
          id: txnId,
          date: currentDueDate,
          amount: recurring.amount,
          description: recurring.description,
          type: recurring.type,
          accountId: recurring.accountId,
          recurringId: recurring.id,
          periodStart,
          periodEnd,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        batch.set(txnRef, transaction);
        createdTransactions.push({ ...transaction, createdAt: transaction.createdAt.toISOString() });

        // Update account balance
        if (recurring.accountId) {
          const accountRef = userRef.collection('accounts').doc(recurring.accountId);
          const accountDoc = await accountRef.get();
          if (accountDoc.exists) {
            const account = accountDoc.data();
            const balanceChange = recurring.type === 'income' ? recurring.amount : -recurring.amount;
            batch.update(accountRef, { 
              currentBalance: account.currentBalance + balanceChange,
              updatedAt: new Date()
            });
          }
        }

        // Calculate next due date
        currentDueDate = calculateNextDueDate(recurring.frequency, currentDueDate);
      }

      // Update the recurring transaction with new next due date
      batch.update(doc.ref, {
        nextDueDate: currentDueDate,
        lastProcessedDate: today,
        updatedAt: new Date(),
      });
    }

    await batch.commit();

    res.json(successResponse({
      processed: createdTransactions.length,
      transactions: createdTransactions,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
