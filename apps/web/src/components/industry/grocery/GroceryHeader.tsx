import Image from 'next/image'
import type { GroceryProduct } from '@/lib/industry/types'

interface Props {
  store: any
  searchQuery: string
  onSearchChange: (q: string) => void
  primaryColor: string
  cartCount: number
  onCartOpen: () => void
}

export function GroceryHeader({
  store, searchQuery, onSearchChange,
  primaryColor, cartCount, onCartOpen,
}: Props) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      {/* Top bar */}
      <div style={{ backgroundColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {store.logo_url ? (
              <div className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-white/30">
                <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
              </div>
            ) : <span className="text-xl">🛒</span>}
            <span className="text-white font-bold text-sm">{store.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {store.is_halal_certified && (
              <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                ✓ HALAL
              </span>
            )}
            {store.address && (
              <span className="text-white/80 text-xs hidden sm:inline flex items-center gap-1">
                📍 {store.address}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search row */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
          <input
            type="text"
            placeholder="Search for groceries, brands, categories…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>

        {/* Mobile cart button */}
        <button
          onClick={onCartOpen}
          className="lg:hidden relative flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          🛒
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
