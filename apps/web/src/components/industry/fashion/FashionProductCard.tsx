'use client'
import { useState } from 'react'
import Image from 'next/image'
import type { FashionProduct } from '@/lib/industry/types'

interface Props {
  product: FashionProduct
  primaryColor: string
  accentColor: string
  isWishlisted: boolean
  onOpenDetail: (product: FashionProduct) => void
  onWishlistToggle: (product: FashionProduct) => void
}

export function FashionProductCard({
  product, primaryColor, accentColor,
  isWishlisted, onOpenDetail, onWishlistToggle,
}: Props) {
  const [activeColourIdx, setActiveColourIdx] = useState(0)
  const [hovered, setHovered] = useState(false)

  const activeColour = product.colours?.[activeColourIdx]
  const displayImage = activeColour?.image_url ?? product.image_url

  const isOnSale = product.is_on_sale && product.sale_price != null
  const displayPrice = isOnSale ? product.sale_price! : product.price
  const discountPct = isOnSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0

  const unavailable = !product.is_available || product.stock_qty <= 0

  // Show alternate hover image if second colour available
  const hoverImage = product.colours?.[1]?.image_url
    ?? product.gallery_urls?.[1]
    ?? null

  return (
    <div
      className={`group cursor-pointer ${unavailable ? 'opacity-70' : ''}`}
      onClick={() => onOpenDetail(product)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image container — portrait 3:4 ratio */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-100" style={{ aspectRatio: '3/4' }}>
        {/* Product image */}
        {displayImage ? (
          <>
            <Image
              src={displayImage}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-500 ${
                hovered && hoverImage ? 'opacity-0' : 'opacity-100'
              }`}
            />
            {hoverImage && (
              <Image
                src={hovered ? hoverImage : displayImage}
                alt={product.name}
                fill
                className={`object-cover absolute inset-0 transition-all duration-500 ${
                  hovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                }`}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
            👗
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_new_arrival && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black text-white shadow">
              NEW
            </span>
          )}
          {isOnSale && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500 text-white shadow">
              -{discountPct}%
            </span>
          )}
          {product.is_bestseller && !product.is_new_arrival && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg shadow"
              style={{ backgroundColor: accentColor, color: 'white' }}>
              ⭐ BEST
            </span>
          )}
        </div>

        {/* Sold Out overlay */}
        {unavailable && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="font-bold text-gray-600 tracking-widest text-sm uppercase">Sold Out</span>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.stopPropagation(); onWishlistToggle(product) }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm hover:scale-110 active:scale-95"
          style={{
            backgroundColor: isWishlisted ? primaryColor : 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span className={`text-base transition-transform ${isWishlisted ? 'scale-110' : ''}`}>
            {isWishlisted ? '❤️' : '🤍'}
          </span>
        </button>

        {/* Quick colour selector on hover */}
        {product.colours && product.colours.length > 1 && (
          <div className={`absolute bottom-3 left-3 flex gap-1.5 transition-all duration-300 ${
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            {product.colours.slice(0, 6).map((colour, idx) => (
              <button
                key={colour.name}
                onClick={(e) => { e.stopPropagation(); setActiveColourIdx(idx) }}
                title={colour.name}
                className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-125 ${
                  activeColourIdx === idx ? 'border-white scale-125 shadow-md' : 'border-white/60'
                }`}
                style={{ backgroundColor: colour.hex }}
              />
            ))}
            {product.colours.length > 6 && (
              <span className="text-white text-xs font-bold self-center bg-black/40 rounded-full px-1.5">
                +{product.colours.length - 6}
              </span>
            )}
          </div>
        )}

        {/* Quick add on hover */}
        {!unavailable && (
          <div className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent transition-all duration-300 ${
            hovered ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-full'
          }`}>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetail(product) }}
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold backdrop-blur-sm transition-all hover:opacity-90"
              style={{ backgroundColor: `${primaryColor}DD` }}
            >
              Select Size
            </button>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="mt-3 space-y-1">
        {product.brand && (
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{product.brand}</p>
        )}
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</p>

        {/* Colour name */}
        {activeColour && product.colours.length > 1 && (
          <p className="text-xs text-gray-400">{activeColour.name}</p>
        )}

        {/* Size availability dots */}
        {product.sizes && product.sizes.length > 0 && (
          <p className="text-xs text-gray-400">
            {product.sizes.slice(0, 5).join(' · ')}
            {product.sizes.length > 5 && ` +${product.sizes.length - 5}`}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span
            className="font-bold text-sm"
            style={{ color: isOnSale ? '#E53E3E' : '#1A202C' }}
          >
            RM {displayPrice.toFixed(2)}
          </span>
          {isOnSale && (
            <span className="text-xs text-gray-400 line-through">RM {product.price.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
