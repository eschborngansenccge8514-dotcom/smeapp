'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { FnbProduct } from '@/lib/industry/types'

const SPICE_ICONS = ['', '🌶️', '🌶️🌶️', '🌶️🌶️🌶️']

interface Props {
  product: FnbProduct
  primaryColor: string
  accentColor: string
  onAdd: (product: FnbProduct, quantity: number) => void
  onOpenDetail: (product: FnbProduct) => void
}

export function FnbProductCard({ product, primaryColor, accentColor, onAdd, onOpenDetail }: Props) {
  const [qty, setQty] = useState(0)
  const unavailable = !product.is_available || product.stock_qty <= 0

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (unavailable) return
    const newQty = qty + 1
    setQty(newQty)
    onAdd(product, 1)
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (qty <= 0) return
    setQty(qty - 1)
    onAdd(product, -1)
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-0 cursor-pointer hover:shadow-md transition-shadow ${unavailable ? 'opacity-60' : ''}`}
      onClick={() => !unavailable && onOpenDetail(product)}
    >
      {/* Text Side */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {product.is_popular && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                🔥 Popular
              </span>
            )}
            {product.is_new && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                ✨ New
              </span>
            )}
            {product.is_halal && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                ✓ Halal
              </span>
            )}
            {product.is_vegan && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                🌱 Vegan
              </span>
            )}
            {product.is_vegetarian && !product.is_vegan && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-700">
                🥗 Veg
              </span>
            )}
            {unavailable && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Sold Out
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</h3>

          {/* Spice level */}
          {product.spice_level && product.spice_level > 0 && (
            <p className="text-xs mt-0.5 text-gray-400">
              {SPICE_ICONS[product.spice_level]}{' '}
              {['', 'Mild', 'Medium', 'Hot'][product.spice_level]}
            </p>
          )}

          {product.description && (
            <p className="text-gray-400 text-sm mt-1.5 line-clamp-2 leading-snug">
              {product.description}
            </p>
          )}
        </div>

        {/* Price + Add button */}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-lg" style={{ color: primaryColor }}>
            RM {product.price.toFixed(2)}
          </span>

          {!unavailable && (
            qty > 0 ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleRemove}
                  className="w-8 h-8 rounded-full border-2 font-bold text-base flex items-center justify-center transition-colors hover:opacity-80"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  −
                </button>
                <span className="w-6 text-center font-bold text-gray-900">{qty}</span>
                <button
                  onClick={handleAdd}
                  className="w-8 h-8 rounded-full font-bold text-base flex items-center justify-center text-white transition-colors hover:opacity-80"
                  style={{ backgroundColor: primaryColor }}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="w-9 h-9 rounded-full font-bold text-xl text-white flex items-center justify-center transition-all hover:opacity-80 active:scale-95 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                +
              </button>
            )
          )}
        </div>
      </div>

      {/* Image Side */}
      <div className="relative w-32 shrink-0">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl"
            style={{ backgroundColor: `${accentColor}15` }}>
            🍜
          </div>
        )}
        {unavailable && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500 text-center px-2">Sold Out</span>
          </div>
        )}
      </div>
    </div>
  )
}
