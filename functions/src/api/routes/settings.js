/**
 * Settings Route
 * GET/PUT/POST /api/settings
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

const VALID_PAY_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly'];

/**
 * GET /api/settings
 * Returns user settings
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const settingsDoc = await db
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc('main')
      .get();

    if (!settingsDoc.exists) {
      return res.status(404).json(
        errorResponse('NOT_FOUND', 'Settings not found. Please complete setup.')
      );
    }

    const settings = settingsDoc.data();
    res.json(successResponse({
      payFrequency: settings.payFrequency,
      payAnchorDate: settings.payAnchorDate,
      netPayAmount: settings.netPayAmount,
      semimonthlyDays: settings.semimonthlyDays,
      primaryAccountId: settings.primaryAccountId,
      categoryBudgets: settings.categoryBudgets || {},
      theme: settings.theme || 'light',
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings
 * Creates or updates user settings
 */
router.put('/', async (req, res, next) => {
  try {
    const { userId } = req;
    const { payFrequency, payAnchorDate, netPayAmount, semimonthlyDays, primaryAccountId, categoryBudgets, theme } = req.body;

    // Validation
    if (payFrequency && !VALID_PAY_FREQUENCIES.includes(payFrequency)) {
      return res.status(400).json(
        errorResponse('INVALID_PAY_FREQUENCY', `Pay frequency must be one of: ${VALID_PAY_FREQUENCIES.join(', ')}`)
      );
    }

    if (payFrequency === 'semimonthly' && !semimonthlyDays) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'semimonthlyDays is required when payFrequency is semimonthly')
      );
    }

    if (semimonthlyDays) {
      if (!Array.isArray(semimonthlyDays) || semimonthlyDays.length !== 2) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'semimonthlyDays must be an array of two numbers')
        );
      }
      if (!semimonthlyDays.every(d => Number.isInteger(d) && d >= 1 && d <= 31)) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'semimonthlyDays values must be integers between 1 and 31')
        );
      }
    }

    if (payAnchorDate && !/^\d{4}-\d{2}-\d{2}$/.test(payAnchorDate)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'payAnchorDate must be in YYYY-MM-DD format')
      );
    }

    if (netPayAmount !== undefined && (typeof netPayAmount !== 'number' || netPayAmount < 0)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'netPayAmount must be a positive number')
      );
    }

    const settingsRef = db.collection('users').doc(userId).collection('settings').doc('main');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      // Create new settings
      const newSettings = {
        payFrequency: payFrequency || 'biweekly',
        payAnchorDate: payAnchorDate || new Date().toISOString().split('T')[0],
        netPayAmount: netPayAmount || 0,
        semimonthlyDays: payFrequency === 'semimonthly' ? semimonthlyDays : null,
        primaryAccountId: primaryAccountId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await settingsRef.set(newSettings);

      return res.status(201).json(successResponse({
        payFrequency: newSettings.payFrequency,
        payAnchorDate: newSettings.payAnchorDate,
        netPayAmount: newSettings.netPayAmount,
        semimonthlyDays: newSettings.semimonthlyDays,
        primaryAccountId: newSettings.primaryAccountId,
        createdAt: newSettings.createdAt.toISOString(),
        updatedAt: newSettings.updatedAt.toISOString(),
      }));
    }

    // Build update object
    const updates = {
      updatedAt: new Date(),
    };

    if (payFrequency) updates.payFrequency = payFrequency;
    if (payAnchorDate) updates.payAnchorDate = payAnchorDate;
    if (netPayAmount !== undefined) updates.netPayAmount = netPayAmount;
    if (semimonthlyDays) updates.semimonthlyDays = semimonthlyDays;
    if (primaryAccountId) updates.primaryAccountId = primaryAccountId;
    if (categoryBudgets !== undefined) updates.categoryBudgets = categoryBudgets;
    if (theme !== undefined) updates.theme = theme;

    // Clear semimonthlyDays if frequency is not semimonthly
    if (payFrequency && payFrequency !== 'semimonthly') {
      updates.semimonthlyDays = null;
    }

    await settingsRef.update(updates);

    // Fetch and return updated settings
    const updatedDoc = await settingsRef.get();
    const settings = updatedDoc.data();

    res.json(successResponse({
      payFrequency: settings.payFrequency,
      payAnchorDate: settings.payAnchorDate,
      netPayAmount: settings.netPayAmount,
      semimonthlyDays: settings.semimonthlyDays,
      primaryAccountId: settings.primaryAccountId,
      categoryBudgets: settings.categoryBudgets || {},
      theme: settings.theme || 'light',
      updatedAt: settings.updatedAt?.toDate?.()?.toISOString() || null,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
