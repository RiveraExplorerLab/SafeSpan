import { errorResponse } from '../utils/response.js';

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Handle known error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      errorResponse('VALIDATION_ERROR', err.message)
    );
  }

  if (err.code === 'NOT_FOUND') {
    return res.status(404).json(
      errorResponse('NOT_FOUND', err.message)
    );
  }

  // Default to internal error
  return res.status(500).json(
    errorResponse('INTERNAL_ERROR', 'An unexpected error occurred')
  );
}

/**
 * Custom error class for app-specific errors
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
