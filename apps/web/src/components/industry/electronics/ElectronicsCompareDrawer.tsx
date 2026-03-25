'use client'
import Image from 'next/image'
import { SPEC_GROUP_ORDER } from '@/lib/industry/themes/electronics'
import type { ElectronicsProduct } from '@/lib/industry/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  compareList: ElectronicsProduct[]
  primaryColor: string
  onAddToCart: (p: ElectronicsProduct) => void
}

export function ElectronicsCompareDrawer({ isOpen, onClose, compareList, primaryColor, onAddToCart }: Props) {
  if (!isOpen || compareList.length === 0) return null

  // Collect all unique spec keys across all products
  const allSpecKeys: { group: string; key: string }[] = []
  const seen = new Set<string>()

  const groupOrder = [
    ...SPEC_GROUP_ORDER,
    ...compareList.flatMap((p) => p.specs.map((s) => s.group)).filter((g, _, arr) =>
      !SPEC_GROUP_ORDER.includes(g) && arr.indexOf(g) === arr.lastIndexOf(g)
    ),
  ]

  for (const group of groupOrder) {
    for (const p of compareList) {
      for (const spec of p.specs.filter((s) => s.group === group)) {
        const uid = `${group}::${spec.key}`
        if (!seen.has(uid)) {
          seen.add(uid)
          allSpecKeys.push({ group, key: spec.key })
        }
      }
    }
  }

  // Group the spec keys
  const specsByGroup: Record<string, string[]> = {}
  for (const { group, key } of allSpecKeys) {
    if (!specsByGroup[group]) specsByGroup[group] = []
    specsByGroup[group].push(key)
  }

  function getSpec(product: ElectronicsProduct, key: string): string {
    return product.specs.find((s) => s.key === key)?.value ?? '—'
  }

  // Highlight winner (lowest price, highest rating)
  const lowestPrice  = Math.min(...compareList.map((p) => p.is_on_promotion && p.promotion_price ? p.promotion_price : p.price))
  const highestRating = Math.max(...compareList.map((p) => p.rating ?? 0))

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden md:inset-0 md:m-auto md:rounded-3xl md:max-w-4xl md:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">⚖️ Compare Products</h2>
            <p className="text-xs text-gray-400 mt-0.5">Side-by-side specification comparison</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold hover:bg-gray-200">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[640px]">
            {/* Product header row */}
            <thead className="sticky top-0 bg-white z-10 border-b-2 border-gray-100">
              <tr>
                <th className="w-36 px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Specification
                </th>
                {compareList.map((p) => {
                  const displayPrice = p.is_on_promotion && p.promotion_price ? p.promotion_price : p.price
                  const isLowest     = displayPrice === lowestPrice
                  const isTopRated   = (p.rating ?? 0) === highestRating && highestRating > 0
                  return (
                    <th key={p.id}
                      className={`px-4 py-3 text-center border-l border-gray-100 ${isLowest ? 'bg-green-50' : ''}`}
                      style={{ minWidth: 160 }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-16 h-16 bg-gray-50 rounded-xl overflow-hidden">
                          {p.image_url
                            ? <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" />
                            : <span className="text-3xl">💻</span>}
                        </div>
                        <div>
                          {p.brand && (
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{p.brand}</p>
                          )}
                          <p className="text-xs font-bold text-gray-900 text-center leading-tight line-clamp-2">
                            {p.name}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <p className={`text-sm font-bold ${isLowest ? 'text-green-600' : 'text-gray-900'}`}>
                            RM {displayPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                            {isLowest && <span className="text-xs ml-1">✓ Best Price</span>}
                          </p>
                          {isTopRated && (
                            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                              ⭐ Top Rated
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => { onAddToCart(p); onClose() }}
                          className="w-full py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {Object.entries(specsByGroup).map(([group, keys]) => (
                <>
                  {/* Group header */}
                  <tr key={`group-${group}`}>
                    <td colSpan={compareList.length + 1}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
                      style={{ backgroundColor: primaryColor }}>
                      {group}
                    </td>
                  </tr>

                  {/* Spec rows */}
                  {keys.map((key, idx) => {
                    const values = compareList.map((p) => getSpec(p, key))
                    const allSame = values.every((v) => v === values[0])
                    return (
                      <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 w-36">{key}</td>
                        {compareList.map((p, pi) => {
                          const val = getSpec(p, key)
                          const isHighlighted = !allSame && val !== '—'
                          const displayPrice = p.is_on_promotion && p.promotion_price ? p.promotion_price : p.price
                          const isLowest = displayPrice === lowestPrice
                          return (
                            <td key={p.id}
                              className={`px-4 py-2.5 text-xs text-center border-l border-gray-100 font-medium ${
                                isLowest ? 'bg-green-50/50' : ''
                              }`}
                            >
                              <span className={isHighlighted ? 'font-bold text-gray-900' : 'text-gray-600'}>
                                {val}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
