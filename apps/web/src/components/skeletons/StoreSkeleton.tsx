export function StoreSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="h-56 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
      {/* Store info bar */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
        </div>
      </div>
      {/* Category nav */}
      <div className="bg-white border-b px-4 py-3 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
      {/* Products */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
