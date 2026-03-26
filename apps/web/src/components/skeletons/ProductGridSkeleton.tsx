export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="aspect-[4/3] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer" />
          <div className="p-3.5 space-y-2">
            <div className="h-2.5 bg-gray-100 rounded w-1/3 animate-pulse" />
            <div className="h-4   bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-3   bg-gray-100 rounded w-2/3 animate-pulse" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
