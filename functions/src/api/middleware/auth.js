import { auth } from '../firebase.js';
import { errorResponse } from '../utils/response.js';

/**
 * Firebase Auth middleware
 * Extracts and verifies the ID token from Authorization header
 * Sets req.userId and req.userEmail on success
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(
      errorResponse('UNAUTHORIZED', 'Missing or invalid Authorization header')
    );
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json(
      errorResponse('UNAUTHORIZED', 'Invalid or expired token')
    );
  }
}
