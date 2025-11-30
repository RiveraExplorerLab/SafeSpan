/**
 * Date utilities for pay period calculations
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) to a Date object at midnight UTC
 * @param {string} dateStr - ISO date string
 * @returns {Date}
 */
export function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * @returns {string}
 */
export function today() {
  return formatDate(new Date());
}

/**
 * Add days to a date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Add months to a date
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
export function addMonths(date, months) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Check if date1 is before date2 (comparing dates only, not time)
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {boolean}
 */
export function isBefore(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  return d1.getTime() < d2.getTime();
}

/**
 * Check if date1 is on or before date2
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {boolean}
 */
export function isOnOrBefore(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  return d1.getTime() <= d2.getTime();
}

/**
 * Check if date1 is after date2
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {boolean}
 */
export function isAfter(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  return d1.getTime() > d2.getTime();
}

/**
 * Get the number of days between two dates
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {number}
 */
export function daysBetween(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get the last day of a month
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {number}
 */
export function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Normalize a day of month (handles 31 for months with fewer days)
 * @param {number} day - Desired day (1-31)
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {number}
 */
export function normalizeDay(day, year, month) {
  const lastDay = lastDayOfMonth(year, month);
  return Math.min(day, lastDay);
}
