'use client'
import { useRef, useEffect } from 'react'
import { ELECTRONICS_CATEGORIES } from '@/lib/industry/themes/electronics'

interface Props {
  activeCategory: string
  onChange: (cat: string) => void
  primaryColor: string
  productCountByCat: Record<string, number>
}

export function ElectronicsCategoryNav({ activeCategory, onChange, primaryColor, productCountByCat }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          ref={activeCategory === 'All' ? activeRef : null}
          onClick={() => onChange('All')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
            activeCategory === 'All'
              ? 'text-white border-transparent shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
          style={activeCategory === 'All' ? { backgroundColor: primaryColor } : {}}
        >
          All Products
        </button>

        {ELECTRONICS_CATEGORIES.filter((c) => (productCountByCat[c.name] ?? 0) > 0).map((cat) => {
          const isActive = activeCategory === cat.name
          return (
            <button
              key={cat.name}
              ref={isActive ? activeRef : null}
              onClick={() => onChange(cat.name)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
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
