/**
 * Accounts Route
 * CRUD for /api/accounts
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

const VALID_ACCOUNT_TYPES = ['checking', 'savings', 'credit_card'];

/**
 * GET /api/accounts
 * Returns all accounts for the user
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .get();

    const accounts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse(accounts));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/accounts/:accountId
 * Returns a single account
 */
router.get('/:accountId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { accountId } = req.params;

    const doc = await db
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(accountId)
      .get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Account not found')
      );
    }

    const account = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(account));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/accounts
 * Creates a new account
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { name, type, currentBalance, creditLimit, apr, dueDay } = req.body;

    // Validation
    if (!name || typeof name !== 'string') {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'name is required')
      );
    }

    if (!type || !VALID_ACCOUNT_TYPES.includes(type)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', `type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}`)
      );
    }

    if (currentBalance === undefined || typeof currentBalance !== 'number') {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'currentBalance is required and must be a number')
      );
    }

    // Credit card specific validation
    if (type === 'credit_card') {
      if (creditLimit === undefined || typeof creditLimit !== 'number' || creditLimit <= 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'creditLimit is required for credit cards and must be a positive number')
        );
      }
    }

    // Generate ID from name (slug-style)
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    const accountData = {
      id,
      name,
      type,
      currentBalance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add credit card specific fields
    if (type === 'credit_card') {
      accountData.creditLimit = creditLimit;
      accountData.apr = typeof apr === 'number' ? apr : null;
      accountData.dueDay = typeof dueDay === 'number' && dueDay >= 1 && dueDay <= 31 ? dueDay : null;
    }

    await db
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(id)
      .set(accountData);

    res.status(201).json(successResponse({
      ...accountData,
      createdAt: accountData.createdAt.toISOString(),
      updatedAt: accountData.updatedAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/accounts/:accountId
 * Updates an account
 */
router.put('/:accountId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { accountId } = req.params;
    const { name, currentBalance, creditLimit, apr, dueDay } = req.body;

    const accountRef = db
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(accountId);

    const doc = await accountRef.get();
    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Account not found')
      );
    }

    const existingData = doc.data();
    const updates = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string') {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'name must be a string')
        );
      }
      updates.name = name;
    }

    if (currentBalance !== undefined) {
      if (typeof currentBalance !== 'number') {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'currentBalance must be a number')
        );
      }
      updates.currentBalance = currentBalance;
    }

    // Credit card specific updates
    if (existingData.type === 'credit_card') {
      if (creditLimit !== undefined) {
        if (typeof creditLimit !== 'number' || creditLimit <= 0) {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'creditLimit must be a positive number')
          );
        }
        updates.creditLimit = creditLimit;
      }

      if (apr !== undefined) {
        if (apr !== null && typeof apr !== 'number') {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'apr must be a number or null')
          );
        }
        updates.apr = apr;
      }

      if (dueDay !== undefined) {
        if (dueDay !== null && (typeof dueDay !== 'number' || dueDay < 1 || dueDay > 31)) {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'dueDay must be between 1 and 31 or null')
          );
        }
        updates.dueDay = dueDay;
      }
    }

    await accountRef.update(updates);

    const updatedDoc = await accountRef.get();
    const account = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedDoc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(account));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/accounts/:accountId
 * Soft-deletes an account (for now, just prevents deletion of primary)
 */
router.delete('/:accountId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { accountId } = req.params;

    // Check if this is the primary account
    const settingsDoc = await db
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc('main')
      .get();

    if (settingsDoc.exists && settingsDoc.data().primaryAccountId === accountId) {
      // Check if there are other accounts
      const accountsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('accounts')
        .get();

      if (accountsSnapshot.size <= 1) {
        return res.status(400).json(
          errorResponse('ACCOUNT_REQUIRED', 'Cannot delete the only account')
        );
      }
    }

    // Delete the account
    await db
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(accountId)
      .delete();

    res.json(successResponse({ deleted: true, id: accountId }));
  } catch (error) {
    next(error);
  }
});

export default router;
