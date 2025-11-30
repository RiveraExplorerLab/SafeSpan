/**
 * Bills Route
 * CRUD for /api/bills
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

const VALID_FREQUENCIES = ['monthly']; // Expand in future versions

/**
 * GET /api/bills
 * Returns all bills (active by default)
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const includeInactive = req.query.includeInactive === 'true';

    let query = db.collection('users').doc(userId).collection('bills');

    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }

    const snapshot = await query.orderBy('dueDay', 'asc').get();

    const bills = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    res.json(successResponse(bills));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bills/:billId
 * Returns a single bill
 */
router.get('/:billId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { billId } = req.params;

    const doc = await db
      .collection('users')
      .doc(userId)
      .collection('bills')
      .doc(billId)
      .get();

    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Bill not found')
      );
    }

    const bill = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(bill));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bills
 * Creates a new bill
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { name, amount, frequency, dueDay, isAutoPay, autoPayAccountId, alreadyPaid } = req.body;

    // Validation
    if (!name || typeof name !== 'string') {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'name is required')
      );
    }

    if (amount === undefined || typeof amount !== 'number' || amount < 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'amount must be a positive number')
      );
    }

    if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`)
      );
    }

    if (!dueDay || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'dueDay must be an integer between 1 and 31')
      );
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    // Get primary account if autoPayAccountId not provided
    let resolvedAutoPayAccountId = autoPayAccountId;
    if (isAutoPay && !autoPayAccountId) {
      const settingsDoc = await db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('main')
        .get();
      
      if (settingsDoc.exists) {
        resolvedAutoPayAccountId = settingsDoc.data().primaryAccountId;
      }
    }

    // If alreadyPaid is true, set lastPaidDate to today so it shows as paid this period
    const today = new Date().toISOString().split('T')[0];

    const billData = {
      id,
      name,
      amount,
      frequency,
      dueDay,
      isAutoPay: isAutoPay || false,
      autoPayAccountId: resolvedAutoPayAccountId || null,
      categoryId: null,
      lastPaidDate: alreadyPaid ? today : null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .collection('users')
      .doc(userId)
      .collection('bills')
      .doc(id)
      .set(billData);

    res.status(201).json(successResponse({
      ...billData,
      createdAt: billData.createdAt.toISOString(),
      updatedAt: billData.updatedAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/bills/:billId
 * Updates a bill
 */
router.put('/:billId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { billId } = req.params;
    const { name, amount, dueDay, isAutoPay, autoPayAccountId, isActive } = req.body;

    const billRef = db
      .collection('users')
      .doc(userId)
      .collection('bills')
      .doc(billId);

    const doc = await billRef.get();
    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Bill not found')
      );
    }

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

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'amount must be a positive number')
        );
      }
      updates.amount = amount;
    }

    if (dueDay !== undefined) {
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'dueDay must be an integer between 1 and 31')
        );
      }
      updates.dueDay = dueDay;
    }

    if (isAutoPay !== undefined) {
      updates.isAutoPay = Boolean(isAutoPay);
    }

    if (autoPayAccountId !== undefined) {
      updates.autoPayAccountId = autoPayAccountId;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    await billRef.update(updates);

    const updatedDoc = await billRef.get();
    const bill = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedDoc.data().updatedAt?.toDate?.()?.toISOString() || null,
    };

    res.json(successResponse(bill));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/bills/:billId
 * Soft-deletes a bill (sets isActive to false)
 */
router.delete('/:billId', async (req, res, next) => {
  try {
    const { userId } = req;
    const { billId } = req.params;

    const billRef = db
      .collection('users')
      .doc(userId)
      .collection('bills')
      .doc(billId);

    const doc = await billRef.get();
    if (!doc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Bill not found')
      );
    }

    await billRef.update({
      isActive: false,
      updatedAt: new Date(),
    });

    res.json(successResponse({ deleted: true, id: billId }));
  } catch (error) {
    next(error);
  }
});

export default router;
