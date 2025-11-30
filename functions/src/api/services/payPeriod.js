/**
 * Pay Period Service
 * Handles pay period boundary calculations and summary management
 */

import { db } from '../firebase.js';
import {
  parseDate,
  formatDate,
  addDays,
  addMonths,
  today,
  isBefore,
  isOnOrBefore,
  isAfter,
  normalizeDay,
} from '../utils/dates.js';

/**
 * Calculate pay period boundaries based on frequency and anchor date
 * @param {string} frequency - 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
 * @param {string} anchorDate - ISO date string of a known pay date
 * @param {number[]} [semimonthlyDays] - [day1, day2] for semimonthly
 * @param {string} [targetDate] - Date to find period for (defaults to today)
 * @returns {{ periodStart: string, periodEnd: string, nextPayDate: string }}
 */
export function calculatePayPeriod(frequency, anchorDate, semimonthlyDays = null, targetDate = null) {
  const target = targetDate ? parseDate(targetDate) : parseDate(today());
  const anchor = parseDate(anchorDate);

  switch (frequency) {
    case 'weekly':
      return calculateWeeklyPeriod(anchor, target, 7);
    case 'biweekly':
      return calculateWeeklyPeriod(anchor, target, 14);
    case 'semimonthly':
      return calculateSemimonthlyPeriod(semimonthlyDays, target);
    case 'monthly':
      return calculateMonthlyPeriod(anchor, target);
    default:
      throw new Error(`Invalid pay frequency: ${frequency}`);
  }
}

/**
 * Calculate period for weekly/biweekly frequencies
 */
function calculateWeeklyPeriod(anchor, target, intervalDays) {
  // Find how many intervals since anchor
  const diffDays = Math.floor((target.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  const intervalsSinceAnchor = Math.floor(diffDays / intervalDays);
  
  // Current period start
  const periodStartDate = addDays(anchor, intervalsSinceAnchor * intervalDays);
  
  // If target is before period start (negative intervals), adjust
  let periodStart = periodStartDate;
  if (isAfter(periodStart, target)) {
    periodStart = addDays(periodStart, -intervalDays);
  }
  
  // Period end is day before next period
  const nextPayDate = addDays(periodStart, intervalDays);
  const periodEnd = addDays(nextPayDate, -1);

  return {
    periodStart: formatDate(periodStart),
    periodEnd: formatDate(periodEnd),
    nextPayDate: formatDate(nextPayDate),
  };
}

/**
 * Calculate period for semimonthly frequency
 * @param {number[]} days - [day1, day2] e.g., [1, 15] or [15, 31]
 * @param {Date} target
 */
function calculateSemimonthlyPeriod(days, target) {
  const [day1, day2] = days.sort((a, b) => a - b);
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1; // 1-12
  const dayOfMonth = target.getUTCDate();

  // Normalize days for this month
  const normalizedDay1 = normalizeDay(day1, year, month);
  const normalizedDay2 = normalizeDay(day2, year, month);

  let periodStart, periodEnd, nextPayDate;

  if (dayOfMonth < normalizedDay1) {
    // Before first pay day of month - we're in period from last month's day2
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevDay2 = normalizeDay(day2, prevYear, prevMonth);
    
    periodStart = new Date(Date.UTC(prevYear, prevMonth - 1, prevDay2));
    periodEnd = addDays(new Date(Date.UTC(year, month - 1, normalizedDay1)), -1);
    nextPayDate = new Date(Date.UTC(year, month - 1, normalizedDay1));
  } else if (dayOfMonth < normalizedDay2) {
    // Between day1 and day2 - we're in first period of month
    periodStart = new Date(Date.UTC(year, month - 1, normalizedDay1));
    periodEnd = addDays(new Date(Date.UTC(year, month - 1, normalizedDay2)), -1);
    nextPayDate = new Date(Date.UTC(year, month - 1, normalizedDay2));
  } else {
    // On or after day2 - we're in second period of month
    periodStart = new Date(Date.UTC(year, month - 1, normalizedDay2));
    
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextDay1 = normalizeDay(day1, nextYear, nextMonth);
    
    periodEnd = addDays(new Date(Date.UTC(nextYear, nextMonth - 1, nextDay1)), -1);
    nextPayDate = new Date(Date.UTC(nextYear, nextMonth - 1, nextDay1));
  }

  return {
    periodStart: formatDate(periodStart),
    periodEnd: formatDate(periodEnd),
    nextPayDate: formatDate(nextPayDate),
  };
}

/**
 * Calculate period for monthly frequency
 */
function calculateMonthlyPeriod(anchor, target) {
  const anchorDay = anchor.getUTCDate();
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  const dayOfMonth = target.getUTCDate();

  const normalizedAnchorDay = normalizeDay(anchorDay, year, month);

  let periodStart, periodEnd, nextPayDate;

  if (dayOfMonth < normalizedAnchorDay) {
    // Before pay day this month - period started last month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevAnchorDay = normalizeDay(anchorDay, prevYear, prevMonth);
    
    periodStart = new Date(Date.UTC(prevYear, prevMonth - 1, prevAnchorDay));
    periodEnd = addDays(new Date(Date.UTC(year, month - 1, normalizedAnchorDay)), -1);
    nextPayDate = new Date(Date.UTC(year, month - 1, normalizedAnchorDay));
  } else {
    // On or after pay day - period started this month
    periodStart = new Date(Date.UTC(year, month - 1, normalizedAnchorDay));
    
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextAnchorDay = normalizeDay(anchorDay, nextYear, nextMonth);
    
    periodEnd = addDays(new Date(Date.UTC(nextYear, nextMonth - 1, nextAnchorDay)), -1);
    nextPayDate = new Date(Date.UTC(nextYear, nextMonth - 1, nextAnchorDay));
  }

  return {
    periodStart: formatDate(periodStart),
    periodEnd: formatDate(periodEnd),
    nextPayDate: formatDate(nextPayDate),
  };
}

/**
 * Get or create a pay period summary document
 * @param {string} userId
 * @param {string} periodId - The period start date (YYYY-MM-DD)
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {Promise<Object>}
 */
export async function getOrCreatePayPeriod(userId, periodId, periodStart, periodEnd) {
  const periodRef = db.collection('users').doc(userId).collection('payPeriods').doc(periodId);
  const periodDoc = await periodRef.get();

  if (periodDoc.exists) {
    return { id: periodDoc.id, ...periodDoc.data() };
  }

  // Create new period summary
  const newPeriod = {
    id: periodId,
    periodStart,
    periodEnd,
    incomeTotal: 0,
    billsTotal: 0,
    discretionaryTotal: 0,
    netChange: 0,
    categoryTotals: {},
    transactionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await periodRef.set(newPeriod);
  return newPeriod;
}

/**
 * Update pay period summary totals
 * @param {string} userId
 * @param {string} periodId
 * @param {Object} deltas - { incomeTotal, billsTotal, discretionaryTotal, transactionCount }
 */
export async function updatePayPeriodSummary(userId, periodId, deltas) {
  const periodRef = db.collection('users').doc(userId).collection('payPeriods').doc(periodId);
  
  const updates = {
    updatedAt: new Date(),
  };

  // Use FieldValue.increment for atomic updates
  const { FieldValue } = await import('firebase-admin/firestore');
  
  if (deltas.incomeTotal !== undefined) {
    updates.incomeTotal = FieldValue.increment(deltas.incomeTotal);
  }
  if (deltas.billsTotal !== undefined) {
    updates.billsTotal = FieldValue.increment(deltas.billsTotal);
  }
  if (deltas.discretionaryTotal !== undefined) {
    updates.discretionaryTotal = FieldValue.increment(deltas.discretionaryTotal);
  }
  if (deltas.transactionCount !== undefined) {
    updates.transactionCount = FieldValue.increment(deltas.transactionCount);
  }

  // Recalculate netChange (we need to read current values for this)
  await periodRef.update(updates);
  
  // Now read and update netChange
  const periodDoc = await periodRef.get();
  const data = periodDoc.data();
  const netChange = data.incomeTotal - data.billsTotal - data.discretionaryTotal;
  
  await periodRef.update({ netChange });
}

/**
 * Determine which summary field a transaction type affects
 * @param {string} transactionType
 * @returns {'incomeTotal' | 'billsTotal' | 'discretionaryTotal'}
 */
export function getSummaryFieldForTransactionType(transactionType) {
  switch (transactionType) {
    case 'income':
      return 'incomeTotal';
    case 'bill_payment':
      return 'billsTotal';
    case 'debit_purchase':
    default:
      return 'discretionaryTotal';
  }
}
