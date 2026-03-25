'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { FnbProduct, FnbAddonOption } from '@/lib/industry/types'

interface Props {
  product: FnbProduct | null
  primaryColor: string
  onClose: () => void
  onAddToCart: (product: FnbProduct, quantity: number, selectedAddons: FnbAddonOption[], notes: string) => void
}

export function FnbProductModal({ product, primaryColor, onClose, onAddToCart }: Props) {
  const [qty, setQty] = useState(1)
  const [selectedAddons, setSelectedAddons] = useState<Record<string, FnbAddonOption>>({})
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (product) { setQty(1); setSelectedAddons({}); setNotes('') }
  }, [product?.id])

  if (!product) return null

  const addonTotal = Object.values(selectedAddons).reduce((s, a) => s + a.price_add, 0)
  const unitPrice = product.price + addonTotal
  const total = unitPrice * qty

  function toggleAddon(groupId: string, option: FnbAddonOption, maxSelect: number) {
    setSelectedAddons((prev) => {
      const groupSelected = Object.entries(prev)
        .filter(([k]) => k.startsWith(`${groupId}:`)).length

      const key = `${groupId}:${option.id}`
      if (prev[key]) {
        const next = { ...prev }; delete next[key]; return next
      }
      if (groupSelected >= maxSelect) {
        // Replace if max 1
        if (maxSelect === 1) {
          const next: Record<string, FnbAddonOption> = {}
          Object.entries(prev).forEach(([k, v]) => {
            if (!k.startsWith(`${groupId}:`)) next[k] = v
          })
          next[key] = option
          return next
        }
        return prev // max reached
      }
      return { ...prev, [key]: option }
    })
  }

  // Check all required groups are filled
  const requiredFilled = (product.addons ?? [])
    .filter((g) => g.required)
    .every((g) => Object.keys(selectedAddons).some((k) => k.startsWith(`${g.id}:`)))

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden md:inset-0 md:m-auto md:max-w-lg md:max-h-[85vh] md:rounded-3xl">
        {/* Image */}
        <div className="relative h-56 shrink-0 bg-gray-100">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl"
              style={{ backgroundColor: `${primaryColor}15` }}>
              🍜
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-700 font-bold shadow-sm hover:bg-white">
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.is_popular && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🔥 Popular</span>}
            {product.is_halal && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Halal</span>}
            {product.is_vegan && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">🌱 Vegan</span>}
            {product.spice_level && product.spice_level > 0
              ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{'🌶️'.repeat(product.spice_level)} {['','Mild','Medium','Hot'][product.spice_level]}</span>
              : null}
          </div>

          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
          <p className="font-bold text-xl mt-1" style={{ color: primaryColor }}>RM {product.price.toFixed(2)}</p>
          {product.description && (
            <p className="text-gray-500 mt-2 leading-relaxed">{product.description}</p>
          )}

          {/* Add-on Groups */}
          {(product.addons ?? []).map((group) => {
            const groupSelected = Object.keys(selectedAddons).filter((k) => k.startsWith(`${group.id}:`)).length

            return (
              <div key={group.id} className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-400">
                      {group.required ? '⚠ Required · ' : 'Optional · '}
                      Choose up to {group.max_select}
                    </p>
                  </div>
                  {group.required && groupSelected === 0 && (
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">Required</span>
                  )}
                  {groupSelected > 0 && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ {groupSelected} selected</span>
                  )}
                </div>

                <div className="space-y-2">
                  {group.options.map((option) => {
                    const key = `${group.id}:${option.id}`
                    const isSelected = !!selectedAddons[key]

                    return (
                      <button key={option.id} type="button"
                        onClick={() => toggleAddon(group.id, option, group.max_select)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                        style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'border-orange-400' : 'border-gray-300'
                          }`} style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor } : {}}>
                            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{option.name}</span>
                        </div>
                        {option.price_add > 0 && (
                          <span className="text-sm font-semibold text-gray-600">+RM {option.price_add.toFixed(2)}</span>
                        )}
                        {option.price_add === 0 && (
                          <span className="text-xs text-gray-400">Free</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Special Notes */}
          <div className="mt-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Special instructions <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. No onions, less spicy, extra sauce…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none text-gray-900"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} />
          </div>
          <div className="h-4" />
        </div>

        {/* Bottom CTA */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-5 mb-4">
            <button onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-10 h-10 rounded-full border-2 font-bold text-lg flex items-center justify-center"
              style={{ borderColor: primaryColor, color: primaryColor }}>
              −
            </button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)}
              className="w-10 h-10 rounded-full font-bold text-lg text-white flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}>
              +
            </button>
          </div>

          <button
            onClick={() => { onAddToCart(product, qty, Object.values(selectedAddons), notes); onClose() }}
            disabled={!requiredFilled}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-between px-5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor }}>
            <span>Add to cart</span>
            <span>RM {total.toFixed(2)}</span>
          </button>

          {!requiredFilled && (
            <p className="text-center text-xs text-orange-500 mt-2">Please complete required selections</p>
          )}
        </div>
      </div>
    </>
  )
}
