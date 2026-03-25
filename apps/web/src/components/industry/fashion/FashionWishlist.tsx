'use client'
import Image from 'next/image'
import type { FashionProduct } from '@/lib/industry/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  wishlist: FashionProduct[]
  primaryColor: string
  onRemove: (productId: string) => void
  onMoveToCart: (product: FashionProduct) => void
}

export function FashionWishlist({ isOpen, onClose, wishlist, primaryColor, onRemove, onMoveToCart }: Props) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">🤍 Wishlist</h2>
            <p className="text-xs text-gray-400 mt-0.5">{wishlist.length} saved item{wishlist.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {wishlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <p className="text-5xl mb-3">🤍</p>
              <p className="font-semibold text-gray-700">Your wishlist is empty</p>
              <p className="text-gray-400 text-sm mt-1">Save items you love to come back later</p>
            </div>
          ) : wishlist.map((product) => {
            const isOnSale = product.is_on_sale && product.sale_price != null
            const displayPrice = isOnSale ? product.sale_price! : product.price

            return (
              <div key={product.id} className="flex gap-3 bg-gray-50 rounded-2xl p-3">
                {/* Image */}
                <div className="relative w-20 shrink-0 rounded-xl overflow-hidden bg-white border border-gray-100"
                  style={{ aspectRatio: '3/4' }}>
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-200">👗</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    {product.brand && (
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{product.brand}</p>
                    )}
                    <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{product.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-bold" style={{ color: isOnSale ? '#E53E3E' : '#1A202C' }}>
                        RM {displayPrice.toFixed(2)}
                      </span>
                      {isOnSale && (
                        <span className="text-xs text-gray-400 line-through">RM {product.price.toFixed(2)}</span>
                      )}
                    </div>
                    {product.colours && product.colours.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {product.colours.slice(0, 4).map((c) => (
                          <div key={c.name} title={c.name}
                            className="w-3.5 h-3.5 rounded-full border border-gray-200"
                            style={{ backgroundColor: c.hex }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onMoveToCart(product)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => onRemove(product.id)}
                      className="px-2 py-1.5 rounded-lg text-xs font-bold text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
