'use client'
import { useState } from 'react'
import Image from 'next/image'
import { REFURBISHED_GRADES } from '@/lib/industry/themes/electronics'
import type { ElectronicsProduct } from '@/lib/industry/types'

interface Props {
  product: ElectronicsProduct
  primaryColor: string
  cartQty: number
  isInCompare: boolean
  onOpenDetail: (p: ElectronicsProduct) => void
  onAdd: (p: ElectronicsProduct) => void
  onToggleCompare: (p: ElectronicsProduct) => void
}

export function ElectronicsProductCard({
  product, primaryColor, cartQty,
  isInCompare, onOpenDetail, onAdd, onToggleCompare,
}: Props) {
  const [imgErr, setImgErr] = useState(false)

  const isOnPromo   = product.is_on_promotion && product.promotion_price != null
  const displayPrice = isOnPromo ? product.promotion_price! : product.price
  const discountPct  = isOnPromo
    ? Math.round(((product.price - product.promotion_price!) / product.price) * 100)
    : 0
  const unavailable  = !product.is_available || product.stock_qty <= 0
  const lowStock     = !unavailable && product.stock_qty <= (product.low_stock_threshold ?? 5)
  const grade        = product.is_refurbished && product.refurbished_grade
    ? REFURBISHED_GRADES[product.refurbished_grade] : null

  const stars = product.rating
    ? '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5 - Math.round(product.rating))
    : null

  return (
    <div
      className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col cursor-pointer group hover:shadow-lg transition-all ${
        isInCompare ? 'shadow-lg' : 'border-gray-100 hover:border-gray-200 shadow-sm'
      } ${unavailable ? 'opacity-60' : ''}`}
      style={isInCompare ? { borderColor: primaryColor } : {}}
      onClick={() => onOpenDetail(product)}
    >
      {/* Image */}
      <div className="relative bg-gray-50 p-4" style={{ aspectRatio: '4/3' }}>
        {product.image_url && !imgErr ? (
          <Image
            src={product.image_url} alt={product.name} fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">💻</div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOnPromo && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-500 text-white shadow-sm">
              -{discountPct}%
            </span>
          )}
          {product.is_new_arrival && !isOnPromo && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-black text-white shadow-sm">NEW</span>
          )}
          {product.is_bestseller && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg shadow-sm"
              style={{ backgroundColor: primaryColor, color: 'white' }}>
              🔥 HOT
            </span>
          )}
          {grade && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{ backgroundColor: grade.bg, color: grade.color }}>
              {product.refurbished_grade} Grade
            </span>
          )}
        </div>

        {/* Compare toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare(product) }}
          title={isInCompare ? 'Remove from compare' : 'Add to compare'}
          className={`absolute top-2 right-2 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border-2 transition-all ${
            isInCompare
              ? 'text-white border-transparent shadow-md'
              : 'bg-white/90 border-gray-200 text-gray-500 hover:border-gray-400'
          }`}
          style={isInCompare ? { backgroundColor: primaryColor } : {}}
        >
          {isInCompare ? '✓' : '⚖'}
        </button>

        {/* Sold Out */}
        {unavailable && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-t-2xl">
            <span className="font-bold text-gray-500 text-sm tracking-wide">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{product.brand}</p>
        )}

        {/* Name */}
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{product.name}</p>

        {/* Rating */}
        {stars && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-yellow-400 tracking-tight">{stars}</span>
            <span className="text-xs text-gray-400">({product.review_count ?? 0})</span>
          </div>
        )}

        {/* Quick specs */}
        {product.quick_specs && product.quick_specs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.quick_specs.slice(0, 3).map((spec) => (
              <span key={spec}
                className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                {spec}
              </span>
            ))}
          </div>
        )}

        {/* Warranty */}
        {product.warranty_months && (
          <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
            🛡️ {product.warranty_months >= 12
              ? `${product.warranty_months / 12}yr`
              : `${product.warranty_months}mo`}
            {product.is_official_warranty ? ' Official Warranty' : ' Warranty'}
          </p>
        )}

        {/* Low stock */}
        {lowStock && (
          <p className="text-xs text-orange-500 font-semibold flex items-center gap-1">
            ⚠ Only {product.stock_qty} left
          </p>
        )}

        {/* Refurbished note */}
        {grade && (
          <p className="text-xs px-2 py-1 rounded-lg font-medium"
            style={{ backgroundColor: grade.bg, color: grade.color }}>
            {grade.description}
          </p>
        )}

        {/* Price + Add */}
        <div className="flex items-end justify-between mt-auto pt-2">
          <div>
            {isOnPromo ? (
              <>
                <p className="text-base font-bold text-red-600">
                  RM {displayPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 line-through">
                  RM {product.price.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </p>
              </>
            ) : (
              <p className="text-base font-bold text-gray-900">
                {product.variants.length > 1 ? 'From ' : ''}
                RM {displayPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {!unavailable && (
            cartQty > 0 ? (
              <div
                className="flex items-center gap-1 border-2 rounded-xl px-1 py-0.5"
                style={{ borderColor: primaryColor }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs font-bold px-1.5" style={{ color: primaryColor }}>
                  {cartQty} in cart
                </span>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  product.variants.length > 1 ? onOpenDetail(product) : onAdd(product)
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-80 active:scale-95 shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {product.variants.length > 1 ? 'Options' : 'Add'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
