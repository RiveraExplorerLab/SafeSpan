import { useState, useCallback, useEffect } from 'react';
import { fetchOverview, syncQueuedTransactions, getQueuedCount, processRecurring } from '../services/api';
import { isOnline, onConnectivityChange, initOfflineDB } from '../services/offline';

/**
 * Hook for fetching and managing dashboard overview data
 * Supports offline caching and transaction queue sync
 */
export function useOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheTime, setCacheTime] = useState(null);
  const [online, setOnline] = useState(isOnline());
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Initialize offline DB on mount
  useEffect(() => {
    initOfflineDB().catch(console.error);
  }, []);

  // Listen for connectivity changes
  useEffect(() => {
    const unsubscribe = onConnectivityChange((isNowOnline) => {
      setOnline(isNowOnline);
      // Auto-sync when coming back online
      if (isNowOnline) {
        handleSync();
      }
    });
    return unsubscribe;
  }, []);

  // Check queued count periodically
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const count = await getQueuedCount();
        setQueuedCount(count);
      } catch (err) {
        console.error('Failed to get queue count:', err);
      }
    };
    checkQueue();
  }, [data]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Process any due recurring transactions first (silently)
      if (isOnline()) {
        try {
          await processRecurring();
        } catch (err) {
          // Silently ignore - recurring processing is optional
          console.debug('Recurring process skipped:', err.message);
        }
      }

      const result = await fetchOverview();
      setData(result.data);
      setFromCache(result.fromCache || false);
      setCacheTime(result.cacheTime || null);

      // Update queued count
      const count = await getQueuedCount();
      setQueuedCount(count);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    if (!isOnline() || syncing) return;

    setSyncing(true);
    try {
      const result = await syncQueuedTransactions();
      if (result.synced > 0) {
        // Refresh data after sync
        await refresh();
      }
      setQueuedCount(result.failed);
      return result;
    } catch (err) {
      console.error('Sync failed:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [refresh, syncing]);

  return {
    data,
    loading,
    error,
    refresh,
    fromCache,
    cacheTime,
    online,
    queuedCount,
    syncing,
    sync: handleSync,
  };
}
