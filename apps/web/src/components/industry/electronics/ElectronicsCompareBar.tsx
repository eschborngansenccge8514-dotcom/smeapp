'use client'
import Image from 'next/image'
import type { ElectronicsProduct } from '@/lib/industry/types'

interface Props {
  compareList: ElectronicsProduct[]
  primaryColor: string
  onRemove: (id: string) => void
  onCompare: () => void
  onClear: () => void
}

export function ElectronicsCompareBar({ compareList, primaryColor, onRemove, onCompare, onClear }: Props) {
  if (compareList.length === 0) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto z-30">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 px-4 py-3 flex items-center gap-3">
        {/* Compare slots */}
        <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-none">
          {[0, 1, 2].map((i) => {
            const p = compareList[i]
            if (!p) return (
              <div key={i}
                className="shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs font-bold">
                +
              </div>
            )
            return (
              <div key={p.id} className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl border-2 overflow-hidden bg-gray-50 flex items-center justify-center"
                  style={{ borderColor: primaryColor }}>
                  {p.image_url
                    ? <Image src={p.image_url} alt={p.name} width={48} height={48} className="object-contain p-1" />
                    : <span className="text-lg">💻</span>}
                </div>
                <button
                  onClick={() => onRemove(p.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-600">
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:inline font-medium">
            {compareList.length}/3 selected
          </span>
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-gray-600 font-semibold px-2 py-1">
            Clear
          </button>
          <button
            onClick={onCompare}
            disabled={compareList.length < 2}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor }}
          >
            ⚖️ Compare {compareList.length < 2 ? `(need ${2 - compareList.length} more)` : 'Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
