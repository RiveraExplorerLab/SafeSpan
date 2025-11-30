import { auth } from './firebase';
import { 
  isOnline, 
  saveToCache, 
  getFromCache, 
  queueTransaction, 
  getQueuedTransactions,
  removeFromQueue 
} from './offline';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get the current user's ID token
 */
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
}

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const error = new Error(data.error?.message || 'API request failed');
    error.code = data.error?.code || 'UNKNOWN_ERROR';
    error.status = response.status;
    throw error;
  }

  return data.data;
}

// ============ Overview ============

export async function fetchOverview() {
  // Try to fetch from network first
  if (isOnline()) {
    try {
      const data = await apiRequest('/api/overview');
      // Cache the result
      await saveToCache('overview', data);
      return { data, fromCache: false };
    } catch (err) {
      // If network fails, try cache
      const cached = await getFromCache('overview');
      if (cached) {
        return { data: cached.data, fromCache: true, cacheTime: cached.timestamp };
      }
      throw err;
    }
  } else {
    // Offline - use cache
    const cached = await getFromCache('overview');
    if (cached) {
      return { data: cached.data, fromCache: true, cacheTime: cached.timestamp };
    }
    throw new Error('No cached data available. Please connect to the internet.');
  }
}

// ============ Settings ============

export async function fetchSettings() {
  return apiRequest('/api/settings');
}

export async function updateSettings(settings) {
  return apiRequest('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ============ Accounts ============

export async function fetchAccounts() {
  return apiRequest('/api/accounts');
}

export async function fetchAccount(accountId) {
  return apiRequest(`/api/accounts/${accountId}`);
}

export async function createAccount(account) {
  return apiRequest('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(account),
  });
}

export async function updateAccount(accountId, updates) {
  return apiRequest(`/api/accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteAccount(accountId) {
  return apiRequest(`/api/accounts/${accountId}`, {
    method: 'DELETE',
  });
}

// ============ Bills ============

export async function fetchBills(includeInactive = false) {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiRequest(`/api/bills${query}`);
}

export async function fetchBill(billId) {
  return apiRequest(`/api/bills/${billId}`);
}

export async function createBill(bill) {
  return apiRequest('/api/bills', {
    method: 'POST',
    body: JSON.stringify(bill),
  });
}

export async function updateBill(billId, updates) {
  return apiRequest(`/api/bills/${billId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteBill(billId) {
  return apiRequest(`/api/bills/${billId}`, {
    method: 'DELETE',
  });
}

// ============ Transactions ============

export async function fetchTransactions(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.payPeriodId) searchParams.set('payPeriodId', params.payPeriodId);
  if (params.accountId) searchParams.set('accountId', params.accountId);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString() ? `?${searchParams}` : '';
  return apiRequest(`/api/transactions${query}`);
}

export async function fetchTransaction(txnId) {
  return apiRequest(`/api/transactions/${txnId}`);
}

export async function createTransaction(transaction) {
  // If offline, queue the transaction
  if (!isOnline()) {
    const queued = await queueTransaction(transaction);
    return { 
      transaction: queued, 
      queued: true,
      message: 'Transaction saved offline. Will sync when connected.' 
    };
  }

  // Online - send to server
  return apiRequest('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
}

export async function updateTransaction(txnId, updates) {
  return apiRequest(`/api/transactions/${txnId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTransaction(txnId) {
  return apiRequest(`/api/transactions/${txnId}`, {
    method: 'DELETE',
  });
}

// ============ Offline Sync ============

/**
 * Sync all queued transactions
 */
export async function syncQueuedTransactions() {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  const queued = await getQueuedTransactions();
  if (queued.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const txn of queued) {
    try {
      await apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          date: txn.date,
          amount: txn.amount,
          description: txn.description,
          type: txn.type,
          billId: txn.billId,
          clientId: txn.clientId,
        }),
      });
      await removeFromQueue(txn.clientId);
      synced++;
    } catch (err) {
      console.error('Failed to sync transaction:', txn.clientId, err);
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Get count of queued transactions
 */
export async function getQueuedCount() {
  const queued = await getQueuedTransactions();
  return queued.length;
}

// ============ Pay Periods ============

export async function fetchPayPeriods(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.before) searchParams.set('before', params.before);

  const query = searchParams.toString() ? `?${searchParams}` : '';
  return apiRequest(`/api/pay-periods${query}`);
}

export async function fetchPayPeriod(periodId) {
  return apiRequest(`/api/pay-periods/${periodId}`);
}

// ============ Recurring Transactions ============

export async function fetchRecurring(includeInactive = false) {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiRequest(`/api/recurring${query}`);
}

export async function createRecurring(recurring) {
  return apiRequest('/api/recurring', {
    method: 'POST',
    body: JSON.stringify(recurring),
  });
}

export async function updateRecurring(recurringId, updates) {
  return apiRequest(`/api/recurring/${recurringId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteRecurring(recurringId) {
  return apiRequest(`/api/recurring/${recurringId}`, {
    method: 'DELETE',
  });
}

export async function processRecurring() {
  return apiRequest('/api/recurring/process', {
    method: 'POST',
  });
}

// ============ Savings Goals ============

export async function fetchGoals() {
  return apiRequest('/api/goals');
}

export async function createGoal(goal) {
  return apiRequest('/api/goals', {
    method: 'POST',
    body: JSON.stringify(goal),
  });
}

export async function updateGoal(goalId, updates) {
  return apiRequest(`/api/goals/${goalId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteGoal(goalId) {
  return apiRequest(`/api/goals/${goalId}`, {
    method: 'DELETE',
  });
}

export async function contributeToGoal(goalId, amount) {
  return apiRequest(`/api/goals/${goalId}/contribute`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
