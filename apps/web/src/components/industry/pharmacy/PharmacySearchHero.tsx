'use client'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  primaryColor: string
  resultCount: number
}

const QUICK_SEARCHES = [
  'Panadol', 'Vitamin C', 'Face mask', 'Antacid',
  'Eye drops', 'Antiseptic', 'Blood pressure', 'Omega-3',
]

export function PharmacySearchHero({ searchQuery, onSearchChange, primaryColor, resultCount }: Props) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
          <input
            type="text"
            placeholder="Search by medicine name, condition or ingredient…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            autoComplete="off"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          ) : (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-semibold">
              ⌘K
            </span>
          )}
        </div>

        {/* Quick search pills */}
        {!searchQuery && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-xs text-gray-400 shrink-0 self-center font-medium">Quick search:</span>
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => onSearchChange(term)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Active search result count */}
        {searchQuery && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{resultCount}</span> result{resultCount !== 1 ? 's' : ''} for
              <span className="font-semibold text-gray-800"> "{searchQuery}"</span>
            </p>
            <button
              onClick={() => onSearchChange('')}
              className="text-xs font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
