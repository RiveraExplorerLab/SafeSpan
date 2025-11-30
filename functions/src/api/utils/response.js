/**
 * Format a success response
 * @param {*} data - Response data
 * @returns {{ success: true, data: * }}
 */
export function successResponse(data) {
  return {
    success: true,
    data,
  };
}

/**
 * Format an error response
 * @param {string} code - Error code
 * @param {string} message - Human-readable message
 * @returns {{ success: false, error: { code: string, message: string } }}
 */
export function errorResponse(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
