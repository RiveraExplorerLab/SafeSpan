export default function OfflineBanner({ online, queuedCount, syncing, onSync, fromCache, cacheTime }) {
  if (online && queuedCount === 0 && !fromCache) {
    return null;
  }

  const formatCacheTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-4xl mx-auto px-4 py-2">
        {!online && (
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            <span>You're offline. Showing cached data.</span>
          </div>
        )}

        {online && fromCache && (
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            <span>Showing cached data from {formatCacheTime(cacheTime)}</span>
          </div>
        )}

        {queuedCount > 0 && (
          <div className="flex items-center justify-between text-sm text-amber-800 mt-1">
            <span>
              {queuedCount} transaction{queuedCount !== 1 ? 's' : ''} waiting to sync
            </span>
            {online && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="text-amber-700 font-medium hover:text-amber-900 disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
