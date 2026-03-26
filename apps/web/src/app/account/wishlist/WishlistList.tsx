'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toggleWishlist } from '@/lib/actions/wishlist'
import { useRouter } from 'next/navigation'

export function WishlistList({ initialItems }: { initialItems: any[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleRemove(productId: string, storeId: string) {
    setLoadingId(productId)
    try {
      await toggleWishlist(productId, storeId)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  if (initialItems.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">❤️</div>
        <h3 className="text-lg font-bold text-gray-900">Your wishlist is empty</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">Save items you like to keep track of them and buy them later.</p>
        <Link href="/" className="mt-8 inline-block px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          Explore Products
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {initialItems.map((item) => (
        <div 
          key={item.id} 
          className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-indigo-100 transition-all flex gap-4 group"
        >
          <Link 
            href={`/products/${item.product_id}`} 
            className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-50 group-hover:scale-[1.02] transition-transform"
          >
            {item.products.image_url ? (
              <Image src={item.products.image_url} alt={item.products.name} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-gray-200">📦</div>
            )}
          </Link>
          
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <Link href={`/products/${item.product_id}`} className="block">
                <h3 className="font-bold text-gray-900 truncate hover:text-indigo-600 transition-colors">{item.products.name}</h3>
              </Link>
              <p className="text-xs text-gray-400 mt-0.5 truncate">by {item.products.stores?.name}</p>
              <p className="text-sm font-bold text-indigo-600 mt-2">RM {item.products.price.toFixed(2)}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href={`/products/${item.product_id}`}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Add to Cart
              </Link>
              <button
                onClick={() => handleRemove(item.product_id, item.store_id)}
                disabled={loadingId === item.product_id}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                title="Remove from wishlist"
              >
                {loadingId === item.product_id ? '...' : '🗑️'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
