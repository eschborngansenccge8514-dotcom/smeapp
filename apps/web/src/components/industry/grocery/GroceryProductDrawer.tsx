'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { GroceryProduct } from '@/lib/industry/types'

interface Props {
  product: GroceryProduct | null
  primaryColor: string
  cartQty: number
  onClose: () => void
  onAdd: (product: GroceryProduct, delta: number) => void
}

export function GroceryProductDrawer({ product, primaryColor, cartQty, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(1)
  if (!product) return null

  const hasPromo = product.is_on_promotion && product.promotion_price != null
  const displayPrice = hasPromo ? product.promotion_price! : product.price
  const maxQty = product.max_order_qty ?? 99
  const savings = hasPromo ? (product.price - product.promotion_price!) * qty : 0

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden md:inset-0 md:m-auto md:max-w-lg md:max-h-[80vh] md:rounded-3xl">

        {/* Product Image */}
        <div className="relative h-52 bg-gray-50 shrink-0">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-contain p-6" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl text-gray-200">
              🛒
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white rounded-full shadow flex items-center justify-center text-gray-500 font-bold hover:bg-gray-50">
            ✕
          </button>
          {hasPromo && (
            <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow">
              {product.promotion_label ?? 'PROMO'}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {product.brand && (
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{product.brand}</p>
          )}
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>

          {/* Weight + price per unit */}
          {product.weight_value && (
            <div className="flex items-center gap-3">
              <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
                {product.weight_value}{product.weight_unit}
              </span>
              {product.price_per_unit && product.price_per_unit_label && (
                <span className="text-xs text-gray-400">
                  RM {product.price_per_unit.toFixed(2)} / {product.price_per_unit_label}
                </span>
              )}
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {product.is_organic && (
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-lg">🌿 Organic</span>
            )}
            {product.is_local && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg">🇲🇾 Local</span>
            )}
            {product.country_of_origin && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg">
                Origin: {product.country_of_origin}
              </span>
            )}
          </div>

          {/* Stock / expiry */}
          <div className="space-y-1">
            {product.stock_qty <= (product.low_stock_threshold ?? 5) && product.is_available && (
              <p className="text-orange-500 text-sm font-semibold flex items-center gap-1.5">
                ⚠ Only {product.stock_qty} remaining
              </p>
            )}
            {product.expiry_note && (
              <p className="text-gray-400 text-sm flex items-center gap-1.5">🕐 {product.expiry_note}</p>
            )}
            {product.min_order_qty && product.min_order_qty > 1 && (
              <p className="text-gray-400 text-sm">Min. order: {product.min_order_qty}</p>
            )}
          </div>

          {product.description && (
            <p className="text-gray-500 text-sm leading-relaxed">{product.description}</p>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold" style={{ color: hasPromo ? '#E53E3E' : '#1A202C' }}>
                  RM {displayPrice.toFixed(2)}
                </span>
                {hasPromo && (
                  <span className="text-sm text-gray-400 line-through">
                    RM {product.price.toFixed(2)}
                  </span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-xs text-green-600 font-semibold">
                  You save RM {savings.toFixed(2)}
                </p>
              )}
            </div>

            {/* Qty selector */}
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-2 py-1">
              <button onClick={() => setQty(Math.max(product.min_order_qty ?? 1, qty - 1))}
                className="w-8 h-8 rounded-lg font-bold text-base flex items-center justify-center transition-colors"
                style={{ color: primaryColor }}>
                −
              </button>
              <span className="text-base font-bold text-gray-900 w-6 text-center">{qty}</span>
              <button onClick={() => setQty(Math.min(maxQty, qty + 1))}
                disabled={qty >= maxQty}
                className="w-8 h-8 rounded-lg font-bold text-base text-white flex items-center justify-center disabled:opacity-30"
                style={{ backgroundColor: primaryColor }}>
                +
              </button>
            </div>
          </div>

          <button
            onClick={() => { onAdd(product, qty); onClose() }}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-between px-5 transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ backgroundColor: primaryColor }}
          >
            <span>{cartQty > 0 ? 'Add More' : 'Add to Basket'}</span>
            <span>RM {(displayPrice * qty).toFixed(2)}</span>
          </button>
        </div>
      </div>
    </>
  )
}
