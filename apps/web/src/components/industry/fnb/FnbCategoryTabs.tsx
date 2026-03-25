'use client'
import { useRef, useEffect } from 'react'

interface Props {
  categories: string[]
  active: string
  onChange: (cat: string) => void
  primaryColor: string
}

export function FnbCategoryTabs({ categories, active, onChange, primaryColor }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll active tab into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])

  if (categories.length <= 1) return null

  return (
    <div className="sticky top-16 z-20 bg-white border-b border-gray-100 shadow-sm">
      <div
        ref={containerRef}
        className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-none max-w-4xl mx-auto"
      >
        {['All', ...categories].map((cat) => {
          const isActive = active === cat
          return (
            <button
              key={cat}
              ref={isActive ? activeRef : null}
              onClick={() => onChange(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              {cat}
            </button>
          )
        })}
      </div>
    </div>
  )
}
