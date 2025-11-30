/**
 * Skeleton loader components for loading states
 */

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  );
}

export function SkeletonHeroCard() {
  return (
    <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white animate-pulse">
      <div className="text-center py-4">
        <div className="h-4 bg-white/30 rounded w-24 mx-auto mb-3"></div>
        <div className="h-12 bg-white/30 rounded w-40 mx-auto mb-2"></div>
        <div className="h-4 bg-white/30 rounded w-32 mx-auto"></div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-white/30 rounded w-24"></div>
          <div className="h-4 bg-white/30 rounded w-16"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-white/30 rounded w-28"></div>
          <div className="h-4 bg-white/30 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="py-3 flex items-center justify-between animate-pulse">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-16"></div>
    </div>
  );
}

export function SkeletonBillCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-36"></div>
          </div>
        </div>
        <div className="h-5 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  );
}

export function SkeletonTransactionList({ count = 5 }) {
  return (
    <div className="card">
      <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="h-3 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
      
      <SkeletonHeroCard />
      
      <div className="mt-6">
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      
      <div className="mt-6">
        <SkeletonTransactionList count={3} />
      </div>
    </main>
  );
}
