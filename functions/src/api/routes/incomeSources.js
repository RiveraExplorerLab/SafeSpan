/**
 * Income Sources Route
 * CRUD operations for managing multiple income sources
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

const VALID_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly'];

/**
 * GET /api/income-sources
 * List all income sources
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const includeInactive = req.query.includeInactive === 'true';

    let query = db.collection('users').doc(userId).collection('incomeSources');
    
    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const sources = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse(sources));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/income-sources/:id
 * Get a single income source
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const doc = await db
      .collection('users')
      .doc(userId)
      .collection('incomeSources')
      .doc(id)
      .get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Income source not found')
      );
    }

    const source = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(source));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/income-sources
 * Create a new income source
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { 
      name, 
      frequency, 
      anchorDate, 
      semimonthlyDays,
      autoAdd,
      expectedAmount,
      deposits 
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Name is required')
      );
    }

    if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`)
      );
    }

    if (!anchorDate || !/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Anchor date is required in YYYY-MM-DD format')
      );
    }

    if (frequency === 'semimonthly') {
      if (!semimonthlyDays || !Array.isArray(semimonthlyDays) || semimonthlyDays.length !== 2) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Semimonthly requires two pay days')
        );
      }
    }

    if (!deposits || !Array.isArray(deposits) || deposits.length === 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'At least one deposit account is required')
      );
    }

    // Validate deposits
    for (const deposit of deposits) {
      if (!deposit.accountId || typeof deposit.amount !== 'number' || deposit.amount <= 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Each deposit must have accountId and positive amount')
        );
      }
    }

    const newSource = {
      name: name.trim(),
      frequency,
      anchorDate,
      semimonthlyDays: frequency === 'semimonthly' ? semimonthlyDays : null,
      autoAdd: autoAdd === true,
      expectedAmount: expectedAmount || deposits.reduce((sum, d) => sum + d.amount, 0),
      deposits,
      isActive: true,
      lastProcessedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db
      .collection('users')
      .doc(userId)
      .collection('incomeSources')
      .add(newSource);

    res.status(201).json(successResponse({
      id: docRef.id,
      ...newSource,
      createdAt: newSource.createdAt.toISOString(),
      updatedAt: newSource.updatedAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/income-sources/:id
 * Update an income source
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { 
      name, 
      frequency, 
      anchorDate, 
      semimonthlyDays,
      autoAdd,
      expectedAmount,
      deposits,
      isActive 
    } = req.body;

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('incomeSources')
      .doc(id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Income source not found')
      );
    }

    const updates = { updatedAt: new Date() };

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Name cannot be empty')
        );
      }
      updates.name = name.trim();
    }

    if (frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(frequency)) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`)
        );
      }
      updates.frequency = frequency;
    }

    if (anchorDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Anchor date must be in YYYY-MM-DD format')
        );
      }
      updates.anchorDate = anchorDate;
    }

    if (semimonthlyDays !== undefined) {
      updates.semimonthlyDays = semimonthlyDays;
    }

    if (autoAdd !== undefined) {
      updates.autoAdd = autoAdd === true;
    }

    if (expectedAmount !== undefined) {
      updates.expectedAmount = expectedAmount;
    }

    if (deposits !== undefined) {
      if (!Array.isArray(deposits) || deposits.length === 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'At least one deposit account is required')
        );
      }
      for (const deposit of deposits) {
        if (!deposit.accountId || typeof deposit.amount !== 'number' || deposit.amount <= 0) {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'Each deposit must have accountId and positive amount')
          );
        }
      }
      updates.deposits = deposits;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive === true;
    }

    await docRef.update(updates);

    const updatedDoc = await docRef.get();
    const source = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedDoc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(source));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/income-sources/:id
 * Delete an income source
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('incomeSources')
      .doc(id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Income source not found')
      );
    }

    await docRef.delete();

    res.json(successResponse({ deleted: true }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/income-sources/process
 * Process auto-add income sources and create transactions
 */
router.post('/process', async (req, res, next) => {
  try {
    const { userId } = req;
    const { calculatePayPeriod } = await import('../services/payPeriod.js');
    const today = new Date().toISOString().split('T')[0];

    // Get all active auto-add income sources
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('incomeSources')
      .where('isActive', '==', true)
      .where('autoAdd', '==', true)
      .get();

    if (snapshot.empty) {
      return res.json(successResponse({ processed: 0, transactions: [] }));
    }

    const transactions = [];
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const source = { id: doc.id, ...doc.data() };
      
      // Calculate current pay date for this source
      const { periodStart } = calculatePayPeriod(
        source.frequency,
        source.anchorDate,
        source.semimonthlyDays,
        today
      );

      // Check if already processed for this pay date
      if (source.lastProcessedDate === periodStart) {
        continue;
      }

      // Check if pay date is today or in the past (within current period)
      if (periodStart <= today) {
        // Create transactions for each deposit
        for (const deposit of source.deposits) {
          const txnRef = db
            .collection('users')
            .doc(userId)
            .collection('transactions')
            .doc();

          const txn = {
            date: periodStart,
            amount: deposit.amount,
            description: source.name,
            type: 'income',
            category: 'Income',
            accountId: deposit.accountId,
            incomeSourceId: source.id,
            payPeriodId: periodStart,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          batch.set(txnRef, txn);
          transactions.push({ id: txnRef.id, ...txn });

          // Update account balance
          const accountRef = db
            .collection('users')
            .doc(userId)
            .collection('accounts')
            .doc(deposit.accountId);

          const accountDoc = await accountRef.get();
          if (accountDoc.exists) {
            const currentBalance = accountDoc.data().currentBalance || 0;
            batch.update(accountRef, { 
              currentBalance: currentBalance + deposit.amount,
              updatedAt: new Date()
            });
          }
        }

        // Update lastProcessedDate
        batch.update(doc.ref, { 
          lastProcessedDate: periodStart,
          updatedAt: new Date()
        });
      }
    }

    await batch.commit();

    res.json(successResponse({ 
      processed: transactions.length, 
      transactions: transactions.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/income-sources/:id/add-paycheck
 * Manually add a paycheck for a manual income source
 */
router.post('/:id/add-paycheck', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { date, deposits } = req.body;

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('incomeSources')
      .doc(id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Income source not found')
      );
    }

    const source = doc.data();
    const payDate = date || new Date().toISOString().split('T')[0];
    const depositAmounts = deposits || source.deposits;

    if (!depositAmounts || depositAmounts.length === 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Deposits are required')
      );
    }

    const { calculatePayPeriod } = await import('../services/payPeriod.js');
    const { periodStart } = calculatePayPeriod(
      source.frequency,
      source.anchorDate,
      source.semimonthlyDays,
      payDate
    );

    const batch = db.batch();
    const transactions = [];

    for (const deposit of depositAmounts) {
      const txnRef = db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc();

      const txn = {
        date: payDate,
        amount: deposit.amount,
        description: source.name,
        type: 'income',
        category: 'Income',
        accountId: deposit.accountId,
        incomeSourceId: id,
        payPeriodId: periodStart,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      batch.set(txnRef, txn);
      transactions.push({ id: txnRef.id, ...txn });

      // Update account balance
      const accountRef = db
        .collection('users')
        .doc(userId)
        .collection('accounts')
        .doc(deposit.accountId);

      const accountDoc = await accountRef.get();
      if (accountDoc.exists) {
        const currentBalance = accountDoc.data().currentBalance || 0;
        batch.update(accountRef, { 
          currentBalance: currentBalance + deposit.amount,
          updatedAt: new Date()
        });
      }
    }

    // Update lastProcessedDate
    batch.update(docRef, { 
      lastProcessedDate: payDate,
      updatedAt: new Date()
    });

    await batch.commit();

    res.status(201).json(successResponse({ 
      transactions: transactions.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
