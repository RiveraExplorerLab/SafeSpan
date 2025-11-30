/**
 * Savings Goals Route
 * CRUD for /api/goals
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

/**
 * GET /api/goals
 * Returns all savings goals
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;

    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('savingsGoals')
      .orderBy('createdAt', 'desc')
      .get();

    const goals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse(goals));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/goals
 * Creates a new savings goal
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { name, targetAmount, currentAmount, targetDate, color, linkedAccountId } = req.body;

    // Validation
    if (!name || typeof name !== 'string') {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'name is required')
      );
    }

    if (targetAmount === undefined || typeof targetAmount !== 'number' || targetAmount <= 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'targetAmount must be a positive number')
      );
    }

    // If linkedAccountId is provided, verify it exists and get its current balance
    let initialAmount = currentAmount || 0;
    if (linkedAccountId) {
      const accountDoc = await db
        .collection('users')
        .doc(userId)
        .collection('accounts')
        .doc(linkedAccountId)
        .get();
      
      if (!accountDoc.exists) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'Linked account not found')
        );
      }
      
      // Use the account's current balance as the starting amount
      initialAmount = accountDoc.data().currentBalance || 0;
    }

    const id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const goalData = {
      id,
      name: name.trim(),
      targetAmount,
      currentAmount: initialAmount,
      targetDate: targetDate || null,
      color: color || 'primary',
      linkedAccountId: linkedAccountId || null,
      isCompleted: initialAmount >= targetAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .collection('users')
      .doc(userId)
      .collection('savingsGoals')
      .doc(id)
      .set(goalData);

    res.status(201).json(successResponse({
      ...goalData,
      createdAt: goalData.createdAt.toISOString(),
      updatedAt: goalData.updatedAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/goals/:id
 * Updates a savings goal
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { name, targetAmount, currentAmount, targetDate, color, isCompleted, linkedAccountId } = req.body;

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('savingsGoals')
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Savings goal not found')
      );
    }

    const updates = { updatedAt: new Date() };

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'name must be a non-empty string')
        );
      }
      updates.name = name.trim();
    }

    if (targetAmount !== undefined) {
      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'targetAmount must be a positive number')
        );
      }
      updates.targetAmount = targetAmount;
    }

    if (currentAmount !== undefined) {
      if (typeof currentAmount !== 'number' || currentAmount < 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'currentAmount must be a non-negative number')
        );
      }
      updates.currentAmount = currentAmount;
      
      // Check if goal is completed
      const target = targetAmount ?? doc.data().targetAmount;
      updates.isCompleted = currentAmount >= target;
    }

    if (targetDate !== undefined) {
      updates.targetDate = targetDate;
    }

    if (color !== undefined) {
      updates.color = color;
    }

    if (isCompleted !== undefined) {
      updates.isCompleted = Boolean(isCompleted);
    }

    if (linkedAccountId !== undefined) {
      // If linking to an account, verify it exists
      if (linkedAccountId) {
        const accountDoc = await db
          .collection('users')
          .doc(userId)
          .collection('accounts')
          .doc(linkedAccountId)
          .get();
        
        if (!accountDoc.exists) {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'Linked account not found')
          );
        }
        
        // Sync currentAmount with account balance
        updates.currentAmount = accountDoc.data().currentBalance || 0;
        const target = targetAmount ?? doc.data().targetAmount;
        updates.isCompleted = updates.currentAmount >= target;
      }
      updates.linkedAccountId = linkedAccountId;
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
 * DELETE /api/goals/:id
 * Deletes a savings goal
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('savingsGoals')
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Savings goal not found')
      );
    }

    await docRef.delete();

    res.json(successResponse({ deleted: true, id }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/goals/:id/contribute
 * Add or subtract from goal progress (only for non-linked goals)
 */
router.post('/:id/contribute', async (req, res, next) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || typeof amount !== 'number') {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'amount is required and must be a number')
      );
    }

    const docRef = db
      .collection('users')
      .doc(userId)
      .collection('savingsGoals')
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Savings goal not found')
      );
    }

    const goal = doc.data();
    
    // If goal is linked to an account, don't allow manual contributions
    if (goal.linkedAccountId) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Cannot manually contribute to account-linked goals. Transfer money to the linked savings account instead.')
      );
    }

    const newAmount = Math.max(0, goal.currentAmount + amount);
    const isCompleted = newAmount >= goal.targetAmount;

    await docRef.update({
      currentAmount: newAmount,
      isCompleted,
      updatedAt: new Date(),
    });

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
 * POST /api/goals/sync-account/:accountId
 * Sync all goals linked to a specific account with its current balance
 * Called after transfers to savings accounts
 */
router.post('/sync-account/:accountId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { accountId } = req.params;

    // Get the account's current balance
    const accountDoc = await db
      .collection('users')
      .doc(userId)
      .collection('accounts')
      .doc(accountId)
      .get();

    if (!accountDoc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Account not found')
      );
    }

    const accountBalance = accountDoc.data().currentBalance || 0;

    // Find all goals linked to this account
    const goalsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('savingsGoals')
      .where('linkedAccountId', '==', accountId)
      .get();

    const batch = db.batch();
    const updatedGoals = [];

    goalsSnapshot.docs.forEach((doc) => {
      const goal = doc.data();
      const isCompleted = accountBalance >= goal.targetAmount;
      
      batch.update(doc.ref, {
        currentAmount: accountBalance,
        isCompleted,
        updatedAt: new Date(),
      });

      updatedGoals.push({
        id: doc.id,
        name: goal.name,
        currentAmount: accountBalance,
        isCompleted,
      });
    });

    if (updatedGoals.length > 0) {
      await batch.commit();
    }

    res.json(successResponse({
      synced: updatedGoals.length,
      goals: updatedGoals,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
