'use client'
import { useRef, useEffect } from 'react'
import { FASHION_CATEGORIES } from '@/lib/industry/themes/fashion'

interface Props {
  activeCategory: string
  genderFilter: string
  onCategoryChange: (cat: string) => void
  primaryColor: string
  productCountByCat: Record<string, number>
}

export function FashionCollectionNav({
  activeCategory, genderFilter, onCategoryChange,
  primaryColor, productCountByCat,
}: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategory])

  const visible = FASHION_CATEGORIES.filter((c) => {
    const hasProducts = (productCountByCat[c.name] ?? 0) > 0
    const matchesGender = !c.gender || genderFilter === 'all' || c.gender === genderFilter
    return hasProducts && matchesGender
  })

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {/* All */}
        <button
          ref={activeCategory === 'All' ? activeRef : null}
          onClick={() => onCategoryChange('All')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
            activeCategory === 'All'
              ? 'text-white border-transparent'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
          style={activeCategory === 'All' ? { backgroundColor: primaryColor } : {}}
        >
          All
        </button>

        {visible.map((cat) => {
          const isActive = activeCategory === cat.name
          return (
            <button
              key={cat.name}
              ref={isActive ? activeRef : null}
              onClick={() => onCategoryChange(cat.name)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
