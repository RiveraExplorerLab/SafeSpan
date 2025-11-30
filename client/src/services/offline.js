/**
 * Offline Storage Service
 * Uses IndexedDB to cache dashboard data and queue offline transactions
 */

const DB_NAME = 'safespan-offline';
const DB_VERSION = 1;

let db = null;

/**
 * Initialize the IndexedDB database
 */
export async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store for cached dashboard data
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }

      // Store for offline transaction queue
      if (!database.objectStoreNames.contains('transactionQueue')) {
        const txnStore = database.createObjectStore('transactionQueue', { 
          keyPath: 'clientId' 
        });
        txnStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Get the database instance, initializing if needed
 */
async function getDB() {
  if (!db) {
    await initOfflineDB();
  }
  return db;
}

// ============ Cache Operations ============

/**
 * Save data to cache
 */
export async function saveToCache(key, data) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const request = store.put({ 
      key, 
      data, 
      timestamp: Date.now() 
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get data from cache
 */
export async function getFromCache(key) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? { data: result.data, timestamp: result.timestamp } : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all cached data
 */
export async function clearCache() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============ Transaction Queue Operations ============

/**
 * Generate a unique client ID for offline transactions
 */
export function generateClientId() {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a transaction to the offline queue
 */
export async function queueTransaction(transaction) {
  const database = await getDB();
  const clientId = generateClientId();
  
  const queuedTxn = {
    ...transaction,
    clientId,
    createdAt: Date.now(),
    status: 'pending',
  };

  return new Promise((resolve, reject) => {
    const dbTransaction = database.transaction(['transactionQueue'], 'readwrite');
    const store = dbTransaction.objectStore('transactionQueue');
    const request = store.add(queuedTxn);

    request.onsuccess = () => resolve(queuedTxn);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all queued transactions
 */
export async function getQueuedTransactions() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['transactionQueue'], 'readonly');
    const store = transaction.objectStore('transactionQueue');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a transaction from the queue
 */
export async function removeFromQueue(clientId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['transactionQueue'], 'readwrite');
    const store = transaction.objectStore('transactionQueue');
    const request = store.delete(clientId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all queued transactions
 */
export async function clearQueue() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['transactionQueue'], 'readwrite');
    const store = transaction.objectStore('transactionQueue');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update transaction status in queue
 */
export async function updateQueuedTransaction(clientId, updates) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['transactionQueue'], 'readwrite');
    const store = transaction.objectStore('transactionQueue');
    const getRequest = store.get(clientId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) {
        const updated = { ...existing, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ============ Utility Functions ============

/**
 * Check if we're online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onConnectivityChange(callback) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
