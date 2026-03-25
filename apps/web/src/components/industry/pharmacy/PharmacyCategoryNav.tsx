'use client'
import { useRef, useEffect, useState } from 'react'
import { PHARMACY_CATEGORIES } from '@/lib/industry/themes/pharmacy'

interface Props {
  activeCategory: string
  onChange: (cat: string) => void
  primaryColor: string
  productCountByCat: Record<string, number>
}

export function PharmacyCategoryNav({ activeCategory, onChange, primaryColor, productCountByCat }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const [showRx, setShowRx] = useState(false)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  const visible = PHARMACY_CATEGORIES.filter((c) => (productCountByCat[c.name] ?? 0) > 0)

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {/* All pill */}
        <button
          ref={activeCategory === 'All' ? activeRef : null}
          onClick={() => onChange('All')}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
            activeCategory === 'All'
              ? 'text-white border-transparent shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
          style={activeCategory === 'All' ? { backgroundColor: primaryColor } : {}}
        >
          <span>🏪</span>
          <span>All Products</span>
        </button>

        {visible.map((cat) => {
          const isActive = activeCategory === cat.name
          return (
            <button
              key={cat.name}
              ref={isActive ? activeRef : null}
              onClick={() => onChange(cat.name)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span className={`text-xs rounded-full px-1.5 font-bold ${
                isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {productCountByCat[cat.name]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
