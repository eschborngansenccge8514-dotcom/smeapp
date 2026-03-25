'use client'
import { useState } from 'react'
import { GROCERY_DEPARTMENTS } from '@/lib/industry/themes/grocery'

interface Props {
  activeDept: string
  activeSubcat: string
  onDeptChange: (dept: string, subcat?: string) => void
  primaryColor: string
  productCountByDept: Record<string, number>
}

export function GrocerySidebar({
  activeDept, activeSubcat, onDeptChange,
  primaryColor, productCountByDept,
}: Props) {
  const [expanded, setExpanded] = useState<string>(activeDept)

  return (
    <aside className="hidden lg:block w-56 shrink-0 sticky top-[113px] self-start max-h-[calc(100vh-130px)] overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* All Departments */}
        <button
          onClick={() => { onDeptChange('All'); setExpanded('') }}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold border-b border-gray-50 transition-colors ${
            activeDept === 'All'
              ? 'text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          style={activeDept === 'All' ? { backgroundColor: primaryColor } : {}}
        >
          <span className="flex items-center gap-2">
            <span>🏪</span> All Departments
          </span>
        </button>

        {GROCERY_DEPARTMENTS.map((dept) => {
          const count = productCountByDept[dept.name] ?? 0
          if (count === 0) return null
          const isActive   = activeDept === dept.name
          const isExpanded = expanded === dept.name

          return (
            <div key={dept.name}>
              <button
                onClick={() => {
                  onDeptChange(dept.name)
                  setExpanded(isExpanded ? '' : dept.name)
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors border-b border-gray-50 ${
                  isActive
                    ? 'font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={isActive ? { color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
              >
                <span className="flex items-center gap-2">
                  <span>{dept.icon}</span>
                  <span className="text-left leading-snug">{dept.name}</span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-gray-400">{count}</span>
                  <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </div>
              </button>

              {/* Subcategories */}
              {isExpanded && dept.subcategories.length > 0 && (
                <div className="bg-gray-50 border-b border-gray-50">
                  {dept.subcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => onDeptChange(dept.name, sub)}
                      className={`w-full text-left pl-10 pr-4 py-2 text-xs transition-colors ${
                        activeSubcat === sub
                          ? 'font-bold'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                      style={activeSubcat === sub ? { color: primaryColor } : {}}
                    >
                      {activeSubcat === sub ? '▸ ' : ''}{sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {(productCountByDept['Other'] ?? 0) > 0 && (
          <button
            onClick={() => { onDeptChange('Other'); setExpanded('') }}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors border-b border-gray-50 ${
              activeDept === 'Other'
                ? 'font-semibold'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            style={activeDept === 'Other' ? { color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
          >
            <span className="flex items-center gap-2">
              <span>📦</span>
              <span className="text-left leading-snug">Other</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400">{productCountByDept['Other']}</span>
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}
