'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import OptimizedImage from '@/components/common/OptimizedImage'
import { cardVariant, cardHover } from '@/components/ui/animations'
import type { Product } from '@/types/customer'
import { toggleWishlist } from '@/lib/actions/wishlist'
import { useCart } from '@/contexts/CartProvider'

interface Props {
  product: Product
  storeSlug: string
  /** Render mode — used in tenant pages vs global search results */
  context?: 'store' | 'search'
  priority?: boolean
}

export function ProductCard({
  product,
  storeSlug,
  context = 'store',
  priority = false,
}: Props) {
  const [adding, setAdding] = useState(false)
  
  // Safe hook usage — context might be null in search page
  let cart: any = null
  try {
    cart = useCart()
  } catch {
    // No CartProvider found (e.g. in marketplace search)
  }

  const addItem = cart?.addItem
  const items   = cart?.items ?? []
  const cartQty = items.find((i: any) => i.product_id === product.id)?.quantity ?? 0

  const isOnSale     = product.is_on_sale && product.sale_price != null
  const displayPrice = isOnSale ? product.sale_price! : product.price
  const discountPct  = isOnSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0
  const unavailable  = !product.is_available || product.stock_qty <= 0
  const lowStock     = !unavailable && (product.stock_qty <= (product.low_stock_threshold || 5))

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (!addItem || unavailable || adding) return
    
    setAdding(true)
    addItem({
      product_id:    product.id,
      store_id:      product.store_id,
      store_slug:    storeSlug,
      product_name:  product.name,
      product_image: product.image_url,
      variant_id:    null,
      variant_label: null,
      unit_price:    displayPrice,
      quantity:      1,
      max_qty:       product.stock_qty,
    })
    
    await new Promise((r) => setTimeout(r, 600))
    setAdding(false)
  }

  return (
    <motion.div
      variants={cardVariant}
      {...cardHover}
      className="group relative"
    >
      <Link
        href={`/store/${product.store_id}/product/${product.id}`}
        prefetch={priority}
        className="block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        {/* Image */}
        <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '4/3' }}>
          <OptimizedImage
            src={product.image_url}
            alt={product.name}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOnSale && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-500 text-white shadow-sm"
              >
                -{discountPct}%
              </motion.span>
            )}
            {product.is_new_arrival && !isOnSale && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-900 text-white shadow-sm">
                NEW
              </span>
            )}
            {product.is_bestseller && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-lg shadow-sm text-white bg-[var(--store-primary)]"
              >
                🔥 TOP
              </span>
            )}
          </div>

          {/* Unavailable overlay */}
          {unavailable && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center backdrop-blur-sm">
              <span className="font-bold text-gray-500 text-sm">Out of Stock</span>
            </div>
          )}

          {/* Cart qty badge */}
          {cartQty > 0 && (
            <div
              className="absolute top-2 right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow bg-[var(--store-primary)]"
            >
              {cartQty}
            </div>
          )}

          {/* Wishlist Button */}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
            {!cartQty && (
              <WishlistButton 
                productId={product.id} 
                storeId={product.store_id} 
              />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-1.5">
          {product.brand && (
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold truncate">
              {product.brand}
            </p>
          )}
          <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[var(--store-primary)] transition-colors">
            {product.name}
          </p>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs leading-none">
                {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
              </span>
              <span className="text-xs text-gray-400">({product.review_count ?? 0})</span>
            </div>
          )}

          {/* Low stock */}
          {lowStock && (
            <p className="text-xs text-orange-500 font-semibold">
              ⚠ Only {product.stock_qty} left
            </p>
          )}

          {/* Price + Add */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {isOnSale ? (
                <>
                  <p className="text-sm font-bold text-red-600">RM {displayPrice.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 line-through">RM {product.price.toFixed(2)}</p>
                </>
              ) : (
                <p className="text-sm font-bold text-gray-900">RM {displayPrice.toFixed(2)}</p>
              )}
            </div>

            {addItem && !unavailable && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleAdd}
                className={`w-8 h-8 rounded-xl text-white font-bold flex items-center justify-center transition-all shadow-sm relative overflow-hidden ${
                   adding ? 'bg-emerald-500' : 'bg-[var(--store-primary)]'
                }`}
                aria-label={`Add ${product.name} to cart`}
              >
                <motion.span
                  key={adding ? 'check' : 'plus'}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-lg leading-none"
                >
                  {adding ? '✓' : '+'}
                </motion.span>
              </motion.button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function WishlistButton({ productId, storeId }: { productId: string, storeId: string }) {
  const [wishlisted, setWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)

  // In a real app, we might check initial state from a global wishlist store
  // or fetch it on mount. For now, we'll just toggle.

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const res = await toggleWishlist(productId, storeId)
      setWishlisted(res.wishlisted)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
        wishlisted ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-500'
      }`}
    >
      <span className={loading ? 'animate-pulse' : ''}>{wishlisted ? '❤️' : '🤍'}</span>
    </button>
  )
}
