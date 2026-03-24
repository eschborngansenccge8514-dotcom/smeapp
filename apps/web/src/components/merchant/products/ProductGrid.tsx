'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { Edit2, Eye, EyeOff, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function ProductGrid({ products, storeId }: { products: any[]; storeId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggleAvailability(id: string, current: boolean) {
    setToggling(id)
    await supabase.from('products').update({ is_available: !current }).eq('id', id)
    toast.success(current ? 'Product hidden' : 'Product visible')
    router.refresh()
    setToggling(null)
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await supabase.from('products').delete().eq('id', id)
    toast.success('Product deleted')
    router.refresh()
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-5xl mb-3">📦</p>
        <p className="text-gray-500 mb-4">No products yet</p>
        <Link href="/merchant/products/new"
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">
          Add Your First Product
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <div key={product.id}
          className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity
            ${!product.is_available ? 'opacity-60' : ''}`}>
          <div className="relative">
            {product.image_urls?.[0] ? (
              <img src={product.image_urls[0]} alt={product.name}
                className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-4xl">
                📦
              </div>
            )}
            {product.stock_qty === 0 && (
              <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Out of Stock
              </span>
            )}
            {product.stock_qty > 0 && product.stock_qty <= 5 && (
              <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Low: {product.stock_qty}
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
            <p className="text-xs text-gray-400 mb-2">{product.categories?.name}</p>
            <p className="font-bold text-indigo-600">{formatPrice(product.price)}</p>
          </div>
          <div className="flex border-t border-gray-50 divide-x divide-gray-50">
            <Link href={`/merchant/products/${product.id}`}
              className="flex-1 py-2 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs gap-1">
              <Edit2 size={13} /> Edit
            </Link>
            <button
              onClick={() => toggleAvailability(product.id, product.is_available)}
              disabled={toggling === product.id}
              className="flex-1 py-2 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs gap-1"
            >
              {product.is_available ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
            </button>
            <button
              onClick={() => deleteProduct(product.id, product.name)}
              className="flex-1 py-2 flex items-center justify-center text-red-400 hover:bg-red-50 text-xs gap-1"
            >
              <Trash2 size={13} /> Del
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
