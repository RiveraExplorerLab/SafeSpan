/**
 * Income Processing Service
 * Handles auto-creation of income transactions on pay dates
 */

import { db } from '../firebase.js';
import { calculatePayPeriod } from './payPeriod.js';
import { today, parseDate, formatDate, isOnOrBefore } from '../utils/dates.js';

/**
 * Process all active income sources for a user
 * Creates income transactions for any pay dates that have passed
 */
export async function processIncomeSources(userId) {
  const userRef = db.collection('users').doc(userId);
  const todayStr = today();
  const todayDate = parseDate(todayStr);

  // Get all active income sources
  const sourcesSnapshot = await userRef
    .collection('incomeSources')
    .where('isActive', '==', true)
    .get();

  if (sourcesSnapshot.empty) {
    return { processed: 0, created: 0 };
  }

  let processed = 0;
  let created = 0;

  for (const doc of sourcesSnapshot.docs) {
    const source = { id: doc.id, ...doc.data() };
    
    // Calculate the current pay period for this income source
    const { periodStart, periodEnd, nextPayDate } = calculatePayPeriod(
      source.frequency,
      source.anchorDate,
      source.semimonthlyDays,
      todayStr
    );

    // Check if we need to process this pay date
    // We look at the periodStart (which is the most recent pay date)
    const lastProcessed = source.lastProcessedDate || null;
    
    // If periodStart is today or in the past, and we haven't processed it yet
    if (isOnOrBefore(parseDate(periodStart), todayDate)) {
      if (!lastProcessed || periodStart > lastProcessed) {
        // Create income transactions for each deposit
        for (const deposit of source.deposits) {
          // Get current pay period for the transaction
          const txnPayPeriod = calculatePayPeriod(
            source.frequency,
            source.anchorDate,
            source.semimonthlyDays,
            periodStart
          );

          const transaction = {
            date: periodStart,
            amount: deposit.amount,
            description: source.name,
            type: 'income',
            category: 'Income',
            accountId: deposit.accountId,
            incomeSourceId: source.id,
            payPeriodId: txnPayPeriod.periodStart,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Check if this transaction already exists (prevent duplicates)
          const existingSnapshot = await userRef
            .collection('transactions')
            .where('incomeSourceId', '==', source.id)
            .where('date', '==', periodStart)
            .where('accountId', '==', deposit.accountId)
            .limit(1)
            .get();

          if (existingSnapshot.empty) {
            // Create the transaction
            await userRef.collection('transactions').add(transaction);

            // Update account balance
            const accountRef = userRef.collection('accounts').doc(deposit.accountId);
            const accountDoc = await accountRef.get();
            if (accountDoc.exists) {
              const account = accountDoc.data();
              await accountRef.update({
                currentBalance: account.currentBalance + deposit.amount,
                updatedAt: new Date(),
              });
            }

            // Update pay period summary
            const periodRef = userRef.collection('payPeriods').doc(txnPayPeriod.periodStart);
            const periodDoc = await periodRef.get();
            if (periodDoc.exists) {
              const period = periodDoc.data();
              await periodRef.update({
                incomeTotal: (period.incomeTotal || 0) + deposit.amount,
                netChange: (period.netChange || 0) + deposit.amount,
                updatedAt: new Date(),
              });
            }

            created++;
          }
        }

        // Update lastProcessedDate
        await doc.ref.update({
          lastProcessedDate: periodStart,
          updatedAt: new Date(),
        });

        processed++;
      }
    }
  }

  return { processed, created };
}
