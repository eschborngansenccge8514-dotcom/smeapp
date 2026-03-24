import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import { Star } from 'lucide-react'
import { AddToCartButtonSimple } from './AddToCartButtonSimple'

interface ProductCardProps {
  product: any
  storeSlug?: string
  showStore?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProductCard({ product, showStore = false, size = 'md' }: ProductCardProps) {
  const href = `/store/${product.store_id}/product/${product.id}`
  const isOutOfStock = product.stock_qty === 0
  const isLowStock = product.stock_qty > 0 && product.stock_qty <= 5

  return (
    <div className={`group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
      hover:shadow-md hover:border-indigo-100 transition-all duration-200
      ${isOutOfStock ? 'opacity-75' : ''}`}>

      {/* Image */}
      <Link href={href} className="block relative overflow-hidden">
        <div className={`relative bg-gray-50 ${size === 'sm' ? 'h-36' : size === 'lg' ? 'h-64' : 'h-48'}`}>
          {product.image_urls?.[0] ? (
            <Image
              src={product.image_urls[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOutOfStock && (
              <span className="bg-gray-800/80 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                Out of Stock
              </span>
            )}
            {isLowStock && !isOutOfStock && (
              <span className="bg-red-500/90 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                Only {product.stock_qty} left
              </span>
            )}
          </div>
          {/* Multiple images indicator */}
          {product.image_urls?.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              +{product.image_urls.length - 1}
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-3">
        {showStore && product.store_name && (
          <Link href={`/store/${product.store_id}`}
            className="text-xs text-indigo-600 font-medium hover:underline block mb-1 truncate">
            {product.store_name}
          </Link>
        )}
        <Link href={href}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-indigo-600 transition-colors mb-1">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.avg_rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star
                  key={s}
                  size={11}
                  className={s <= Math.round(product.avg_rating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-200 fill-gray-200'}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">({product.review_count})</span>
          </div>
        )}

        {/* Price row + Cart */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <p className="font-bold text-indigo-700 text-base">{formatPrice(product.price)}</p>
            {product.product_variants && product.product_variants.length > 0 && (
              <p className="text-xs text-gray-400">
                {product.product_variants.length} options
              </p>
            )}
          </div>
          {!isOutOfStock && (
            <AddToCartButtonSimple product={product} />
          )}
        </div>
      </div>
    </div>
  )
}
