'use client'
import { useRef, useEffect } from 'react'
import { GROCERY_DEPARTMENTS } from '@/lib/industry/themes/grocery'

interface Props {
  activeDept: string
  onChange: (dept: string) => void
  primaryColor: string
  productCountByDept: Record<string, number>
}

export function GroceryDeptTabs({ activeDept, onChange, primaryColor, productCountByDept }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeDept])

  const visibleDepts = [
    { name: 'All', icon: '🏪' },
    ...GROCERY_DEPARTMENTS.filter((d) => (productCountByDept[d.name] ?? 0) > 0),
  ]
  if ((productCountByDept['Other'] ?? 0) > 0) {
    visibleDepts.push({ name: 'Other', icon: '📦', subcategories: [] } as any)
  }

  return (
    <div className="lg:hidden bg-white border-b border-gray-100 sticky top-[105px] z-20">
      <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
        {visibleDepts.map((dept) => {
          const isActive = activeDept === dept.name
          return (
            <button
              key={dept.name}
              ref={isActive ? activeRef : null}
              onClick={() => onChange(dept.name)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600'
              }`}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <span>{dept.icon}</span>
              <span>{dept.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
