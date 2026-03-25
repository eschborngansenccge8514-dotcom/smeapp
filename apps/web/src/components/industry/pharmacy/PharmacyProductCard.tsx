'use client'
import { useState } from 'react'
import Image from 'next/image'
import { RX_CONFIG, DOSAGE_FORM_ICONS } from '@/lib/industry/themes/pharmacy'
import type { PharmacyProduct } from '@/lib/industry/types'

interface Props {
  product: PharmacyProduct
  primaryColor: string
  cartQty: number
  onAdd: (product: PharmacyProduct, delta: number) => void
  onOpenDetail: (product: PharmacyProduct) => void
}

export function PharmacyProductCard({ product, primaryColor, cartQty, onAdd, onOpenDetail }: Props) {
  const [imgErr, setImgErr] = useState(false)
  const rx = RX_CONFIG[product.rx_status]
  const isRx = product.rx_status === 'prescription'
  const isPhOnly = product.rx_status === 'pharmacist_only'
  const unavailable = !product.is_available || product.stock_qty <= 0
  const lowStock = !unavailable && product.stock_qty <= (product.low_stock_threshold ?? 5)
  const hasPromo = product.is_on_promotion && product.promotion_price != null
  const displayPrice = hasPromo ? product.promotion_price! : product.price
  const dosageIcon = DOSAGE_FORM_ICONS[product.dosage_form?.toLowerCase() ?? 'default'] ?? '💊'

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-0 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer ${unavailable ? 'opacity-60' : ''}`}
      onClick={() => onOpenDetail(product)}
    >
      {/* Image */}
      <div className="relative w-28 shrink-0 bg-gray-50 flex items-center justify-center p-3">
        {product.image_url && !imgErr ? (
          <Image
            src={product.image_url} alt={product.name}
            fill className="object-contain p-2"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-4xl opacity-30">{dosageIcon}</span>
        )}

        {/* Rx badge over image */}
        <div
          className="absolute bottom-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-md"
          style={{ backgroundColor: rx.bg, color: rx.color, border: `1px solid ${rx.border}` }}
        >
          {rx.icon} {rx.shortLabel}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-1.5 min-w-0">
        {/* Brand + name */}
        <div>
          {product.brand && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{product.brand}</p>
          )}
          <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</p>
          {product.generic_name && product.generic_name !== product.name && (
            <p className="text-xs text-gray-400 mt-0.5 italic">({product.generic_name})</p>
          )}
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-1.5">
          {product.dosage_strength && (
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
              {dosageIcon} {product.dosage_strength}
            </span>
          )}
          {product.dosage_form && (
            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
              {product.dosage_form}
            </span>
          )}
          {product.pack_size && (
            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
              {product.pack_size}
            </span>
          )}
        </div>

        {/* Indications */}
        {product.indications && product.indications.length > 0 && (
          <p className="text-xs text-gray-400 line-clamp-1">
            For: {product.indications.slice(0, 3).join(' · ')}
          </p>
        )}

        {/* Warnings row */}
        {(isRx || isPhOnly) && (
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: rx.bg, color: rx.color }}
          >
            <span>{rx.icon}</span>
            <span>{rx.description}</span>
          </div>
        )}

        {/* Age restriction */}
        {product.age_restriction && (
          <p className="text-xs text-orange-500 flex items-center gap-1 font-medium">
            ⚠ {product.age_restriction}
          </p>
        )}

        {/* Stock status */}
        {lowStock && (
          <p className="text-xs text-orange-500 font-semibold flex items-center gap-1">
            ⚠ Only {product.stock_qty} left
          </p>
        )}

        {/* Price + Add button */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div>
            {hasPromo ? (
              <div>
                <span className="font-bold text-base text-red-600">
                  RM {displayPrice.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 line-through ml-1.5">
                  RM {product.price.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="font-bold text-base text-gray-900">
                RM {product.price.toFixed(2)}
              </span>
            )}
          </div>

          {!unavailable && !isRx && (
            cartQty > 0 ? (
              <div
                className="flex items-center gap-1.5 border-2 rounded-xl px-1.5 py-0.5"
                style={{ borderColor: primaryColor }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onAdd(product, -1)}
                  className="w-6 h-6 rounded-lg font-bold text-sm flex items-center justify-center"
                  style={{ color: primaryColor }}
                >
                  −
                </button>
                <span className="text-sm font-bold w-5 text-center" style={{ color: primaryColor }}>
                  {cartQty}
                </span>
                <button
                  onClick={() => onAdd(product, 1)}
                  className="w-6 h-6 rounded-lg font-bold text-sm text-white flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(product, 1) }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-80 active:scale-95 ${
                  isPhOnly ? 'opacity-90' : ''
                }`}
                style={{ backgroundColor: primaryColor }}
              >
                {isPhOnly ? '💬 Add' : 'Add'}
              </button>
            )
          )}

          {isRx && !unavailable && (
            <button
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all hover:opacity-80"
              style={{ borderColor: rx.color, color: rx.color }}
            >
              📋 Upload Rx
            </button>
          )}

          {unavailable && (
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-xl">
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
