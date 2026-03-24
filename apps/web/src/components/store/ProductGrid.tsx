'use client'
import { useCartStore } from '@/stores/cartStore'
import { formatPrice } from '@/lib/utils'
import { ShoppingCart, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function ProductGrid({ products, store }: { products: any[]; store: any }) {
  const { addItem, getItemById } = useCartStore()

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 mt-6">
        <p className="text-5xl mb-4">📦</p>
        <p className="text-gray-500 font-medium">No products available yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {products.map((product) => {
        const inCart = getItemById(product.id)
        return (
          <div key={product.id} className="bg-white rounded-3xl shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-50 relative group">
            <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <ShoppingCart size={48} className="text-gray-200" />
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold text-gray-900 leading-snug truncate">{product.name}</h3>
              {product.description && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2 min-h-[32px]">{product.description}</p>
              )}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
                <span className="font-extrabold text-indigo-600 text-xl tracking-tighter">
                  {formatPrice(product.price)}
                </span>
                <button
                  onClick={() => {
                    addItem(
                      {
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image_urls: product.image_urls ?? (product.image_url ? [product.image_url] : []),
                        quantity: 1,
                        stock_qty: product.stock_qty ?? 99,
                        variant_id: null,
                        store_id: store.id,
                      },
                      store.id,
                      store.name,
                    )
                    toast.success(`${product.name} added to cart`, {
                      icon: <ShoppingCart className="h-4 w-4" />,
                      duration: 2000,
                    })
                  }}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all active:scale-95"
                >
                  <Plus size={16} strokeWidth={3} />
                  {inCart ? `(${inCart.quantity})` : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
