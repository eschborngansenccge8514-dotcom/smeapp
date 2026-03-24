'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/stores/cartStore'
import { formatPrice } from '@/lib/utils'
import { ShoppingCart, Star, Store, Minus, Plus, Heart, Share2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export function ProductInfo({ product }: { product: any }) {
  const { addItem, storeId, clearCart } = useCartStore()
  const router = useRouter()

  const variants: any[] = product.product_variants?.filter((v: any) => v.is_active)
    .sort((a: any, b: any) => a.sort_order - b.sort_order) ?? []

  const [selectedVariant, setSelectedVariant] = useState<any>(
    variants.length > 0 ? variants[0] : null
  )
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [wishlist, setWishlist] = useState(false)

  const activePrice = selectedVariant?.price ?? product.price
  const activeStock = selectedVariant?.stock_qty ?? product.stock_qty
  const isOutOfStock = activeStock === 0

  function handleAddToCart() {
    if (storeId && storeId !== product.store_id) {
      if (!confirm('Your cart has items from a different store. Clear and add this item?')) return
      clearCart()
    }
    addItem({
      ...product,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      price: activePrice,
      variant_id: selectedVariant?.id ?? null,
      quantity,
    }, product.store_id, product.stores?.name)

    setAddedToCart(true)
    toast.success('Added to cart', { icon: '🛍️' })
    setTimeout(() => setAddedToCart(false), 2500)
  }

  function handleBuyNow() {
    handleAddToCart()
    router.push('/cart')
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied!')
    }
  }

  return (
    <div className="space-y-5">
      {/* Category + Share + Wishlist */}
      <div className="flex items-center justify-between">
        {product.categories && (
          <span className="text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full">
            {product.categories.icon} {product.categories.name}
          </span>
        )}
        <div className="flex gap-2">
          <button onClick={() => setWishlist(!wishlist)}
            className={`p-2 rounded-xl transition-colors ${wishlist ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-50 hover:text-red-400'}`}>
            <Heart size={18} className={wishlist ? 'fill-red-500' : ''} />
          </button>
          <button onClick={share} className="p-2 rounded-xl text-gray-400 bg-gray-50 hover:text-indigo-500 transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Product name */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
        {/* Rating */}
        {product.avg_rating > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={15}
                  className={s <= Math.round(product.avg_rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">{Number(product.avg_rating).toFixed(1)}</span>
            <a href="#reviews" className="text-sm text-indigo-600 hover:underline">
              ({product.review_count} reviews)
            </a>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-indigo-700">{formatPrice(activePrice)}</span>
        {selectedVariant && selectedVariant.price && selectedVariant.price !== product.price && (
          <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>
        )}
      </div>

      {/* Stock indicator */}
      <div>
        {isOutOfStock ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Out of Stock
          </span>
        ) : activeStock <= 5 ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Only {activeStock} left
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500" /> In Stock
          </span>
        )}
      </div>

      {/* Variant selector */}
      {variants.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Select Option:
            {selectedVariant && (
              <span className="text-indigo-600 ml-1">{selectedVariant.name}</span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => { setSelectedVariant(v); setQuantity(1) }}
                disabled={v.stock_qty === 0}
                className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all
                  ${selectedVariant?.id === v.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : v.stock_qty === 0
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                      : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'}`}
              >
                {v.name}
                {v.price && v.price !== product.price && (
                  <span className="ml-1 text-xs opacity-70">+{formatPrice(v.price - product.price)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity selector */}
      {!isOutOfStock && (
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Quantity:</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                disabled={quantity <= 1}
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(activeStock, q + 1))}
                className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                disabled={quantity >= activeStock}
              >
                <Plus size={16} />
              </button>
            </div>
            <span className="text-sm text-gray-400">{activeStock} available</span>
          </div>
        </div>
      )}

      {/* Total price */}
      {quantity > 1 && (
        <div className="bg-indigo-50 rounded-xl p-3 text-sm">
          <span className="text-indigo-700">
            {quantity} × {formatPrice(activePrice)} = <strong>{formatPrice(activePrice * quantity)}</strong>
          </span>
        </div>
      )}

      {/* CTA Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all
            ${addedToCart
              ? 'bg-green-500 text-white'
              : isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}
        >
          {addedToCart ? <><Check size={18} /> Added!</> : <><ShoppingCart size={18} /> Add to Cart</>}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Buy Now →
        </button>
      </div>

      {/* Store info */}
      <Link href={`/store/${product.store_id}`}
        className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {product.stores?.logo_url
            ? <img src={product.stores.logo_url} className="w-full h-full object-cover" />
            : <Store size={20} className="text-gray-400" />
          }
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{product.stores?.name}</p>
          {product.stores?.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-xs text-gray-500">{Number(product.stores.rating).toFixed(1)} store rating</span>
            </div>
          )}
        </div>
        <span className="ml-auto text-indigo-500 text-sm">View Store →</span>
      </Link>
    </div>
  )
}
