import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get the current user's ID token
 * @param {boolean} forceRefresh - Force refresh the token
 */
async function getAuthToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken(forceRefresh);
}

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  let token;
  
  try {
    token = await getAuthToken(false);
  } catch (err) {
    throw new Error('Not authenticated');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const makeRequest = async (authToken) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cache-Control': 'no-cache',
        ...options.headers,
      },
    });
    return response;
  };

  let response = await makeRequest(token);

  // If we get a 401, try refreshing the token once
  if (response.status === 401) {
    try {
      token = await getAuthToken(true);
      response = await makeRequest(token);
    } catch (refreshError) {
      throw new Error('Session expired. Please sign in again.');
    }
  }

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
  return apiRequest('/api/overview');
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

export async function markBillPaid(billId) {
  const today = new Date().toISOString().split('T')[0];
  return apiRequest(`/api/bills/${billId}`, {
    method: 'PUT',
    body: JSON.stringify({ lastPaidDate: today }),
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

// ============ Income Sources ============

export async function fetchIncomeSources(includeInactive = false) {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiRequest(`/api/income-sources${query}`);
}

export async function createIncomeSource(source) {
  return apiRequest('/api/income-sources', {
    method: 'POST',
    body: JSON.stringify(source),
  });
}

export async function updateIncomeSource(sourceId, updates) {
  return apiRequest(`/api/income-sources/${sourceId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteIncomeSource(sourceId) {
  return apiRequest(`/api/income-sources/${sourceId}`, {
    method: 'DELETE',
  });
}

export async function processIncomeSources() {
  return apiRequest('/api/income-sources/process', {
    method: 'POST',
  });
}

export async function addPaycheck(sourceId, { date, deposits } = {}) {
  return apiRequest(`/api/income-sources/${sourceId}/add-paycheck`, {
    method: 'POST',
    body: JSON.stringify({ date, deposits }),
  });
}

// ============ Analytics ============

export async function fetchSpendingTrends(periods = 6) {
  return apiRequest(`/api/analytics/spending-trends?periods=${periods}`);
}
