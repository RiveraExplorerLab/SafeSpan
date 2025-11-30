import { useState, useCallback } from 'react';
import { fetchOverview, processRecurring } from '../services/api';

/**
 * Hook for fetching and managing dashboard overview data
 */
export function useOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Process any due recurring transactions first (silently)
      try {
        await processRecurring();
      } catch (err) {
        // Silently ignore - recurring processing is optional
        console.debug('Recurring process skipped:', err.message);
      }

      const result = await fetchOverview();
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
