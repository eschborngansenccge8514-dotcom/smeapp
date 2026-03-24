'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

interface ProductFiltersProps {
  categories: any[]
  totalCount: number
}

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Popular' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Highest Rated' },
]

export function ProductFilters({ categories, totalCount }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showPriceDrawer, setShowPriceDrawer] = useState(false)

  const activeCategory = searchParams.get('category')
  const activeSort     = searchParams.get('sort') ?? 'popular'
  const minPrice       = searchParams.get('min_price') ?? ''
  const maxPrice       = searchParams.get('max_price') ?? ''
  const [localMin, setLocalMin] = useState(minPrice)
  const [localMax, setLocalMax] = useState(maxPrice)

  const activeFilterCount = [activeCategory, minPrice, maxPrice].filter(Boolean).length

  const updateParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  function applyPrice() {
    const params = new URLSearchParams(searchParams.toString())
    if (localMin) params.set('min_price', localMin)
    else params.delete('min_price')
    if (localMax) params.set('max_price', localMax)
    else params.delete('max_price')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
    setShowPriceDrawer(false)
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('category')
    params.delete('min_price')
    params.delete('max_price')
    setLocalMin('')
    setLocalMax('')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-3">
      {/* Top row: sort + filter button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{totalCount} products</p>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
              <X size={13} /> Clear filters ({activeFilterCount})
            </button>
          )}
          <select
            value={activeSort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowPriceDrawer(!showPriceDrawer)}
            className={`flex items-center gap-1.5 border rounded-xl px-3 py-2 text-sm transition-colors
              ${(minPrice || maxPrice) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <SlidersHorizontal size={14} /> Price
            {(minPrice || maxPrice) && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => updateParam('category', null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${!activeCategory ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParam('category', cat.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Price filter drawer */}
      {showPriceDrawer && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg w-72">
          <p className="font-semibold text-sm text-gray-900 mb-3">Price Range</p>
          <div className="flex gap-3 items-center mb-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Min (RM)</label>
              <input
                type="number" min="0" value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0"
              />
            </div>
            <span className="text-gray-400 mt-4">–</span>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Max (RM)</label>
              <input
                type="number" min="0" value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Any"
              />
            </div>
          </div>
          {/* Quick price ranges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[['Under RM10', '', '10'], ['RM10–RM50', '10', '50'], ['RM50–RM100', '50', '100'], ['Above RM100', '100', '']].map(([label, min, max]) => (
              <button key={label}
                onClick={() => { setLocalMin(min); setLocalMax(max) }}
                className="text-xs border border-gray-200 px-2.5 py-1 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={applyPrice}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">
              Apply
            </button>
            <button onClick={() => { setLocalMin(''); setLocalMax(''); setShowPriceDrawer(false) }}
              className="px-3 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200">
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
