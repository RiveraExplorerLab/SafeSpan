/**
 * Admin Routes
 * For managing users (invite-only system)
 */

import { Router } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

// Admin email from environment variable
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req, res, next) {
  if (!ADMIN_EMAIL || req.userEmail !== ADMIN_EMAIL) {
    return res.status(403).json(
      errorResponse('FORBIDDEN', 'Admin access required')
    );
  }
  next();
}

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const listResult = await getAuth().listUsers(100);
    const users = listResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      createdAt: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime,
    }));
    res.json(successResponse(users));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:uid
 * Update a user's display name
 */
router.put('/users/:uid', requireAdmin, async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { displayName } = req.body;

    if (!displayName) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'displayName is required')
      );
    }

    const updatedUser = await getAuth().updateUser(uid, { displayName });
    
    res.json(successResponse({
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
