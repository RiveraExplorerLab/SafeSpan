/**
 * Transactions Route
 * CRUD for /api/transactions
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  calculatePayPeriod,
  getOrCreatePayPeriod,
  updatePayPeriodSummary,
  getSummaryFieldForTransactionType,
} from '../services/payPeriod.js';

const router = Router();

const VALID_TRANSACTION_TYPES = ['income', 'debit_purchase', 'bill_payment', 'transfer', 'cc_payment'];

const DEFAULT_CATEGORIES = [
  'food',
  'transport', 
  'entertainment',
  'shopping',
  'utilities',
  'health',
  'subscriptions',
  'income',
  'other'
];

/**
 * Calculate balance change for a transaction based on account type
 * For checking/savings:
 *   - income: +amount
 *   - debit_purchase/bill_payment: -amount
 * For credit_card:
 *   - debit_purchase: +amount (increases debt)
 *   - cc_payment: -amount (decreases debt)
 */
function calculateBalanceChange(type, amount, accountType) {
  if (accountType === 'credit_card') {
    // Credit card: purchases increase balance (debt), payments decrease it
    if (type === 'debit_purchase') return amount;
    if (type === 'cc_payment') return -amount;
    return 0; // Other types shouldn't apply to credit cards
  } else {
    // Checking/Savings: income increases, purchases/bills decrease
    if (type === 'income') return amount;
    if (type === 'debit_purchase' || type === 'bill_payment') return -amount;
    return 0;
  }
}

/**
 * GET /api/transactions
 * Returns transactions with filtering and pagination
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const {
      payPeriodId,
      accountId,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    let query = db.collection('users').doc(userId).collection('transactions');

    // Apply filters
    if (payPeriodId) {
      query = query.where('payPeriodId', '==', payPeriodId);
    }

    if (accountId) {
      // For account filter, we need to get transactions where accountId OR toAccountId matches
      // Firestore doesn't support OR queries directly, so we'll filter in memory
    }

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    // Order and paginate
    query = query.orderBy('date', 'desc').limit(limitNum + 1);

    const snapshot = await query.get();

    let allDocs = snapshot.docs;

    // Filter by account in memory if needed (for transfers that affect either account)
    if (accountId) {
      allDocs = allDocs.filter(doc => {
        const data = doc.data();
        return data.accountId === accountId || data.toAccountId === accountId;
      });
    }

    const hasMore = allDocs.length > limitNum;
    const docs = hasMore ? allDocs.slice(0, limitNum) : allDocs;

    const transactions = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse({
      transactions,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore,
      },
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/transactions/:txnId
 * Returns a single transaction
 */
router.get('/:txnId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { txnId } = req.params;

    const doc = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .doc(txnId)
      .get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Transaction not found')
      );
    }

    const transaction = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(transaction));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transactions
 * Creates a new transaction
 * Atomically updates account balance(s) and pay period summary
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { date, amount, description, type, accountId, toAccountId, billId, category } = req.body;

    // Validation
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'date is required in YYYY-MM-DD format')
      );
    }

    if (amount === undefined || typeof amount !== 'number' || amount < 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'amount must be a positive number')
      );
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'description is required')
      );
    }

    if (!type || !VALID_TRANSACTION_TYPES.includes(type)) {
      return res.status(400).json(
        errorResponse('INVALID_TRANSACTION_TYPE', `type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`)
      );
    }

    // Transfer-specific validation
    if (type === 'transfer') {
      if (!toAccountId) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'toAccountId is required for transfers')
        );
      }
    }

    // CC payment validation
    if (type === 'cc_payment') {
      if (!toAccountId) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'toAccountId (credit card account) is required for credit card payments')
        );
      }
    }

    const userRef = db.collection('users').doc(userId);

    // Get settings for pay period calculation and default account
    const settingsDoc = await userRef.collection('settings').doc('main').get();
    if (!settingsDoc.exists) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'User settings not found. Please complete setup.')
      );
    }
    const settings = settingsDoc.data();

    // Resolve source account
    const resolvedAccountId = accountId || settings.primaryAccountId;
    const accountRef = userRef.collection('accounts').doc(resolvedAccountId);
    const accountDoc = await accountRef.get();
    
    if (!accountDoc.exists) {
      return res.status(400).json(
        errorResponse('NOT_FOUND', 'Source account not found')
      );
    }
    const account = accountDoc.data();

    // For transfers and cc_payments, validate destination account
    let toAccount = null;
    let toAccountRef = null;
    if (type === 'transfer' || type === 'cc_payment') {
      if (toAccountId === resolvedAccountId) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Cannot transfer to the same account')
        );
      }
      toAccountRef = userRef.collection('accounts').doc(toAccountId);
      const toAccountDoc = await toAccountRef.get();
      if (!toAccountDoc.exists) {
        return res.status(400).json(
          errorResponse('NOT_FOUND', 'Destination account not found')
        );
      }
      toAccount = toAccountDoc.data();

      // Validate cc_payment goes to a credit card
      if (type === 'cc_payment' && toAccount.type !== 'credit_card') {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Credit card payment destination must be a credit card account')
        );
      }
    }

    // Calculate which pay period this transaction belongs to
    const { periodStart, periodEnd } = calculatePayPeriod(
      settings.payFrequency,
      settings.payAnchorDate,
      settings.semimonthlyDays,
      date
    );

    // Ensure pay period exists
    await getOrCreatePayPeriod(userId, periodStart, periodStart, periodEnd);

    // Calculate balance changes based on account types
    let sourceBalanceChange, destBalanceChange;
    
    if (type === 'transfer') {
      // Simple transfer between accounts
      sourceBalanceChange = -amount;
      destBalanceChange = amount;
    } else if (type === 'cc_payment') {
      // Payment from checking to credit card
      sourceBalanceChange = -amount; // Deduct from checking
      destBalanceChange = -amount; // Reduce credit card balance (debt)
    } else {
      // Regular transaction on single account
      sourceBalanceChange = calculateBalanceChange(type, amount, account.type);
      destBalanceChange = 0;
    }

    const newSourceBalance = account.currentBalance + sourceBalanceChange;
    const newDestBalance = toAccount ? toAccount.currentBalance + destBalanceChange : null;

    // Generate transaction ID
    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction document
    const transactionData = {
      id: txnId,
      date,
      amount,
      description,
      type,
      accountId: resolvedAccountId,
      toAccountId: (type === 'transfer' || type === 'cc_payment') ? toAccountId : null,
      billId: billId || null,
      category: category || null,
      payPeriodId: periodStart,
      clientId: null,
      syncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Use batched write for atomicity
    const batch = db.batch();

    // Write transaction
    const txnRef = userRef.collection('transactions').doc(txnId);
    batch.set(txnRef, transactionData);

    // Update source account balance
    batch.update(accountRef, {
      currentBalance: newSourceBalance,
      updatedAt: new Date(),
    });

    // Update destination account balance (for transfers and cc_payments)
    if ((type === 'transfer' || type === 'cc_payment') && toAccountRef) {
      batch.update(toAccountRef, {
        currentBalance: newDestBalance,
        updatedAt: new Date(),
      });
    }

    // If this pays a bill, update the bill's lastPaidDate
    if (billId && type === 'bill_payment') {
      const billRef = userRef.collection('bills').doc(billId);
      batch.update(billRef, {
        lastPaidDate: date,
        updatedAt: new Date(),
      });
    }

    await batch.commit();

    // Update pay period summary
    // Transfers and cc_payments don't affect period income/spending totals
    if (type !== 'transfer' && type !== 'cc_payment') {
      const summaryField = getSummaryFieldForTransactionType(type);
      const summaryDeltas = {
        [summaryField]: amount,
        transactionCount: 1,
      };
      await updatePayPeriodSummary(userId, periodStart, summaryDeltas);
    } else {
      // Just increment transaction count
      await updatePayPeriodSummary(userId, periodStart, {
        transactionCount: 1,
      });
    }

    // Sync savings goals if this was a transfer to a savings account
    if (type === 'transfer' && toAccount && toAccount.type === 'savings') {
      // Find and update any goals linked to this savings account
      const goalsSnapshot = await userRef
        .collection('savingsGoals')
        .where('linkedAccountId', '==', toAccountId)
        .get();
      
      const goalsBatch = db.batch();
      goalsSnapshot.docs.forEach((doc) => {
        const goal = doc.data();
        const isCompleted = newDestBalance >= goal.targetAmount;
        goalsBatch.update(doc.ref, {
          currentAmount: newDestBalance,
          isCompleted,
          updatedAt: new Date(),
        });
      });
      
      if (!goalsSnapshot.empty) {
        await goalsBatch.commit();
      }
    }

    res.status(201).json(successResponse({
      transaction: {
        ...transactionData,
        createdAt: transactionData.createdAt.toISOString(),
        updatedAt: transactionData.updatedAt.toISOString(),
      },
      accountBalance: newSourceBalance,
      toAccountBalance: newDestBalance,
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/transactions/:txnId
 * Updates a transaction
 * Recalculates affected balances and summaries
 */
router.put('/:txnId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { txnId } = req.params;
    const { date, amount, description, type, billId, category } = req.body;

    const userRef = db.collection('users').doc(userId);
    const txnRef = userRef.collection('transactions').doc(txnId);

    const txnDoc = await txnRef.get();
    if (!txnDoc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Transaction not found')
      );
    }

    const oldTxn = txnDoc.data();

    // Don't allow editing transfer/cc_payment type or changing to/from these types
    const specialTypes = ['transfer', 'cc_payment'];
    if (specialTypes.includes(oldTxn.type) || (type && specialTypes.includes(type))) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Cannot edit transfer or credit card payment transactions. Delete and recreate instead.')
      );
    }

    // Build updates
    const updates = {
      updatedAt: new Date(),
    };

    if (date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'date must be in YYYY-MM-DD format')
        );
      }
      updates.date = date;
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'amount must be a positive number')
        );
      }
      updates.amount = amount;
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'description must be a string')
        );
      }
      updates.description = description;
    }

    if (type !== undefined) {
      if (!VALID_TRANSACTION_TYPES.includes(type) || specialTypes.includes(type)) {
        return res.status(400).json(
          errorResponse('INVALID_TRANSACTION_TYPE', `type must be one of: ${VALID_TRANSACTION_TYPES.filter(t => !specialTypes.includes(t)).join(', ')}`)
        );
      }
      updates.type = type;
    }

    if (billId !== undefined) {
      updates.billId = billId;
    }

    if (category !== undefined) {
      updates.category = category;
    }

    // Calculate balance and summary adjustments
    const newAmount = updates.amount ?? oldTxn.amount;
    const newType = updates.type ?? oldTxn.type;
    const newDate = updates.date ?? oldTxn.date;

    // Get account type for balance calculation
    const accountRef = userRef.collection('accounts').doc(oldTxn.accountId);
    const accountDoc = await accountRef.get();
    const accountType = accountDoc.data().type;

    // Get settings for pay period recalculation
    const settingsDoc = await userRef.collection('settings').doc('main').get();
    const settings = settingsDoc.data();

    // Check if pay period changed
    const { periodStart: newPeriodStart } = calculatePayPeriod(
      settings.payFrequency,
      settings.payAnchorDate,
      settings.semimonthlyDays,
      newDate
    );
    updates.payPeriodId = newPeriodStart;

    // Calculate old and new balance effects
    const oldBalanceEffect = calculateBalanceChange(oldTxn.type, oldTxn.amount, accountType);
    const newBalanceEffect = calculateBalanceChange(newType, newAmount, accountType);
    const balanceDelta = newBalanceEffect - oldBalanceEffect;

    // Update account balance if there's a change
    if (balanceDelta !== 0) {
      const newBalance = accountDoc.data().currentBalance + balanceDelta;
      
      await accountRef.update({
        currentBalance: newBalance,
        updatedAt: new Date(),
      });
    }

    // Update the transaction
    await txnRef.update(updates);

    // Update pay period summaries
    const oldSummaryField = getSummaryFieldForTransactionType(oldTxn.type);
    const newSummaryField = getSummaryFieldForTransactionType(newType);

    // Remove from old period/field
    await updatePayPeriodSummary(userId, oldTxn.payPeriodId, {
      [oldSummaryField]: -oldTxn.amount,
      transactionCount: oldTxn.payPeriodId !== newPeriodStart ? -1 : 0,
    });

    // Add to new period/field
    if (oldTxn.payPeriodId !== newPeriodStart || oldSummaryField !== newSummaryField) {
      // Ensure new period exists
      const { periodEnd } = calculatePayPeriod(
        settings.payFrequency,
        settings.payAnchorDate,
        settings.semimonthlyDays,
        newDate
      );
      await getOrCreatePayPeriod(userId, newPeriodStart, newPeriodStart, periodEnd);
    }

    await updatePayPeriodSummary(userId, newPeriodStart, {
      [newSummaryField]: newAmount,
      transactionCount: oldTxn.payPeriodId !== newPeriodStart ? 1 : 0,
    });

    // Fetch updated transaction
    const updatedDoc = await txnRef.get();
    const transaction = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedDoc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(transaction));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/transactions/:txnId
 * Deletes a transaction and reverses its effects
 */
router.delete('/:txnId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { txnId } = req.params;

    const userRef = db.collection('users').doc(userId);
    const txnRef = userRef.collection('transactions').doc(txnId);

    const txnDoc = await txnRef.get();
    if (!txnDoc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Transaction not found')
      );
    }

    const txn = txnDoc.data();

    // Get account for type info
    const accountRef = userRef.collection('accounts').doc(txn.accountId);
    const accountDoc = await accountRef.get();
    const accountType = accountDoc.data().type;

    const batch = db.batch();

    // Delete the transaction
    batch.delete(txnRef);

    // Reverse source account balance change
    let sourceBalanceChange;
    if (txn.type === 'transfer') {
      sourceBalanceChange = txn.amount; // Was deducted, now add back
    } else if (txn.type === 'cc_payment') {
      sourceBalanceChange = txn.amount; // Was deducted from checking, add back
    } else {
      // Reverse the original balance change
      sourceBalanceChange = -calculateBalanceChange(txn.type, txn.amount, accountType);
    }
    
    const newSourceBalance = accountDoc.data().currentBalance + sourceBalanceChange;
    batch.update(accountRef, {
      currentBalance: newSourceBalance,
      updatedAt: new Date(),
    });

    // Reverse destination account balance change (for transfers and cc_payments)
    if ((txn.type === 'transfer' || txn.type === 'cc_payment') && txn.toAccountId) {
      const toAccountRef = userRef.collection('accounts').doc(txn.toAccountId);
      const toAccountDoc = await toAccountRef.get();
      if (toAccountDoc.exists) {
        let destBalanceChange;
        if (txn.type === 'transfer') {
          destBalanceChange = -txn.amount; // Was added, now deduct
        } else {
          // cc_payment: was reduced (negative), now add back
          destBalanceChange = txn.amount;
        }
        const newDestBalance = toAccountDoc.data().currentBalance + destBalanceChange;
        batch.update(toAccountRef, {
          currentBalance: newDestBalance,
          updatedAt: new Date(),
        });
      }
    }

    await batch.commit();

    // Update pay period summary
    if (txn.type !== 'transfer' && txn.type !== 'cc_payment') {
      const summaryField = getSummaryFieldForTransactionType(txn.type);
      await updatePayPeriodSummary(userId, txn.payPeriodId, {
        [summaryField]: -txn.amount,
        transactionCount: -1,
      });
    } else {
      await updatePayPeriodSummary(userId, txn.payPeriodId, {
        transactionCount: -1,
      });
    }

    res.json(successResponse({ deleted: true, id: txnId }));
  } catch (error) {
    next(error);
  }
});

export default router;
