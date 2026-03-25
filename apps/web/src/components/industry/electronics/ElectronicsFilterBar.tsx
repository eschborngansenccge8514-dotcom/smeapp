'use client'
import { useState } from 'react'
import { SORT_OPTIONS } from '@/lib/industry/themes/electronics'

interface Props {
  searchQuery: string
  sortBy: string
  brandFilter: string
  priceRange: [number, number]
  maxPrice: number
  availableBrands: string[]
  resultCount: number
  onSearchChange: (q: string) => void
  onSortChange: (s: string) => void
  onBrandChange: (b: string) => void
  onPriceChange: (r: [number, number]) => void
  compareCount: number
  onCompareOpen: () => void
  primaryColor: string
}

export function ElectronicsFilterBar({
  searchQuery, sortBy, brandFilter, priceRange, maxPrice,
  availableBrands, resultCount,
  onSearchChange, onSortChange, onBrandChange, onPriceChange,
  compareCount, onCompareOpen, primaryColor,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 space-y-2.5">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by product name, brand, model…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen((f) => !f)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
              filtersOpen ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            style={filtersOpen ? { backgroundColor: primaryColor } : {}}
          >
            ⚙️ Filters
            {(brandFilter !== 'all' || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="shrink-0 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 hidden sm:block"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
            {/* Brand filter */}
            {availableBrands.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Brand</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onBrandChange('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      brandFilter === 'all'
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={brandFilter === 'all' ? { backgroundColor: primaryColor } : {}}
                  >
                    All Brands
                  </button>
                  {availableBrands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => onBrandChange(brand)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        brandFilter === brand
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                      style={brandFilter === brand ? { backgroundColor: primaryColor } : {}}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Price Range</p>
                <p className="text-xs text-gray-500 font-semibold">
                  RM {priceRange[0].toLocaleString()} — RM {priceRange[1].toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="range" min={0} max={maxPrice} step={50}
                  value={priceRange[0]}
                  onChange={(e) => onPriceChange([+e.target.value, priceRange[1]])}
                  className="flex-1 accent-current"
                  style={{ accentColor: primaryColor }}
                />
                <input
                  type="range" min={0} max={maxPrice} step={50}
                  value={priceRange[1]}
                  onChange={(e) => onPriceChange([priceRange[0], +e.target.value])}
                  className="flex-1 accent-current"
                  style={{ accentColor: primaryColor }}
                />
              </div>
            </div>

            {/* Sort on mobile */}
            <div className="sm:hidden">
              <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Sort By</p>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={() => { onBrandChange('all'); onPriceChange([0, maxPrice]) }}
              className="text-xs font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            <span className="font-bold text-gray-700">{resultCount}</span> product{resultCount !== 1 ? 's' : ''}
            {brandFilter !== 'all' && <span className="text-gray-500"> · Brand: <strong>{brandFilter}</strong></span>}
          </p>
          {compareCount > 0 && (
            <button
              onClick={onCompareOpen}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl text-white transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              ⚖️ Compare ({compareCount}/3)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
