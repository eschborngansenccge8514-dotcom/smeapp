'use client'
import { FASHION_FILTER_OPTIONS } from '@/lib/industry/themes/fashion'

interface Props {
  genderFilter: string
  sortBy: string
  searchQuery: string
  totalCount: number
  onGenderChange: (g: string) => void
  onSortChange: (s: string) => void
  onSearchChange: (q: string) => void
  onWishlistOpen: () => void
  wishlistCount: number
  primaryColor: string
}

export function FashionFilterBar({
  genderFilter, sortBy, searchQuery, totalCount,
  onGenderChange, onSortChange, onSearchChange,
  onWishlistOpen, wishlistCount, primaryColor,
}: Props) {
  return (
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 space-y-2.5">
        {/* Search + wishlist */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search styles, brands, colours…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                ✕
              </button>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={onWishlistOpen}
            className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:border-gray-300 transition-all shrink-0"
          >
            <span>🤍</span>
            <span className="hidden sm:inline">Wishlist</span>
            {wishlistCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                {wishlistCount}
              </span>
            )}
          </button>
        </div>

        {/* Gender + sort row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Gender pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {FASHION_FILTER_OPTIONS.gender.map((g) => (
              <button
                key={g.value}
                onClick={() => onGenderChange(g.value)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  genderFilter === g.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
                style={genderFilter === g.value ? { backgroundColor: primaryColor } : {}}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="shrink-0 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          >
            {FASHION_FILTER_OPTIONS.sort.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Results bar */}
        {searchQuery && (
          <p className="text-xs text-gray-500">
            <span className="font-bold text-gray-800">{totalCount}</span> result{totalCount !== 1 ? 's' : ''} for
            "<span className="font-bold text-gray-800">{searchQuery}</span>"
          </p>
        )}
      </div>
    </div>
  )
}
