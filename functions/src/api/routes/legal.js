/**
 * Legal Route
 * GET/POST /api/legal
 */

import { Router } from 'express';
import { db } from '../firebase.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

// GET /api/legal/status - Check if user has agreed to terms
router.get('/status', async (req, res) => {
  try {
    const userId = req.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json(successResponse({ agreed: false }));
    }

    const data = userDoc.data();
    const agreed = !!(data.tosAgreedAt && data.privacyAgreedAt);
    
    res.json(successResponse({ 
      agreed,
      tosAgreedAt: data.tosAgreedAt || null,
      privacyAgreedAt: data.privacyAgreedAt || null
    }));
  } catch (error) {
    console.error('Error checking legal status:', error);
    res.status(500).json(errorResponse('SERVER_ERROR', error.message));
  }
});

// POST /api/legal/agree - Record user's agreement to terms
router.post('/agree', async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date().toISOString();
    
    await db.collection('users').doc(userId).set({
      tosAgreedAt: now,
      privacyAgreedAt: now,
      tosVersion: '2025-12-01',
      privacyVersion: '2025-12-01',
    }, { merge: true });

    res.json(successResponse({ 
      success: true, 
      agreedAt: now 
    }));
  } catch (error) {
    console.error('Error recording legal agreement:', error);
    res.status(500).json(errorResponse('SERVER_ERROR', error.message));
  }
});

export default router;
