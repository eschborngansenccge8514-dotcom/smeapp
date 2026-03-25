'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { GroceryProduct } from '@/lib/industry/types'

interface Props {
  product: GroceryProduct
  primaryColor: string
  onAdd: (product: GroceryProduct, delta: number) => void
  onOpenDetail: (product: GroceryProduct) => void
  cartQty: number
}

export function GroceryProductCard({ product, primaryColor, onAdd, onOpenDetail, cartQty }: Props) {
  const [imgError, setImgError] = useState(false)
  const unavailable = !product.is_available || product.stock_qty <= 0
  const lowStock = !unavailable && product.stock_qty <= (product.low_stock_threshold ?? 5)
  const hasPromo = product.is_on_promotion && product.promotion_price != null
  const maxQty = product.max_order_qty ?? 99
  const minQty = product.min_order_qty ?? 1

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col cursor-pointer group hover:shadow-md hover:border-gray-200 transition-all ${unavailable ? 'opacity-60' : ''}`}
      onClick={() => !unavailable && onOpenDetail(product)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.image_url && !imgError ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
            🛒
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasPromo && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-500 text-white shadow-sm">
              {product.promotion_label ?? 'PROMO'}
            </span>
          )}
          {product.is_organic && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-500 text-white shadow-sm">
              🌿 Organic
            </span>
          )}
          {product.is_local && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500 text-white shadow-sm">
              🇲🇾 Local
            </span>
          )}
        </div>

        {/* Sold out overlay */}
        {unavailable && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="font-bold text-gray-500 text-sm">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium truncate">
            {product.brand}
          </p>
        )}

        {/* Name */}
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
          {product.name}
        </p>

        {/* Weight */}
        {product.weight_value && product.weight_unit && (
          <p className="text-xs text-gray-400">
            {product.weight_value}{product.weight_unit}
            {product.price_per_unit && product.price_per_unit_label && (
              <span className="ml-1">(RM {product.price_per_unit.toFixed(2)}/{product.price_per_unit_label})</span>
            )}
          </p>
        )}

        {/* Low stock warning */}
        {lowStock && (
          <p className="text-xs text-orange-500 font-semibold flex items-center gap-1">
            ⚠ Only {product.stock_qty} left
          </p>
        )}

        {/* Expiry note */}
        {product.expiry_note && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            🕐 {product.expiry_note}
          </p>
        )}

        {/* Price row */}
        <div className="flex items-end justify-between mt-auto pt-1">
          <div>
            {hasPromo ? (
              <>
                <p className="text-base font-bold" style={{ color: '#E53E3E' }}>
                  RM {product.promotion_price!.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 line-through">
                  RM {product.price.toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-base font-bold text-gray-900">
                RM {product.price.toFixed(2)}
              </p>
            )}
          </div>

          {/* Add to cart control */}
          {!unavailable && (
            cartQty > 0 ? (
              <div
                className="flex items-center gap-1.5 rounded-xl border-2 px-1 py-0.5"
                style={{ borderColor: primaryColor }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onAdd(product, -1)}
                  className="w-6 h-6 rounded-lg font-bold text-sm flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ color: primaryColor }}
                >
                  −
                </button>
                <span className="text-sm font-bold w-5 text-center" style={{ color: primaryColor }}>
                  {cartQty}
                </span>
                <button
                  onClick={() => cartQty < maxQty ? onAdd(product, 1) : null}
                  disabled={cartQty >= maxQty}
                  className="w-6 h-6 rounded-lg font-bold text-sm flex items-center justify-center text-white transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ backgroundColor: primaryColor }}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(product, minQty) }}
                className="w-8 h-8 rounded-xl text-white font-bold text-lg flex items-center justify-center transition-all hover:opacity-80 active:scale-95 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                +
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
