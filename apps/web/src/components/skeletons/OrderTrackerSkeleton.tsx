export function OrderTrackerSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-7 bg-gray-100 rounded-full w-24 animate-pulse" />
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full w-full animate-pulse" />
        {/* Steps */}
        <div className="flex justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-2.5 bg-gray-100 rounded w-14 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* Order items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3.5 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
