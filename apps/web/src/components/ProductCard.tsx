'use client'
import Image from 'next/image'
import { useCartStore } from '@/stores/useCartStore'

interface ProductCardProps {
  product: {
    id: string
    name: string
    description: string | null
    price: number
    image_url: string | null
    is_available: boolean
    stock_qty: number
  }
  storeId: string
  storeName: string
  onCrossStore?: () => void
}

export function ProductCard({ product, storeId, storeName, onCrossStore }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)

  function handleAdd() {
    const result = addItem(
      { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: 1, 
        image_urls: product.image_url ? [product.image_url] : [],
        stock_qty: product.stock_qty,
        variant_id: null,
        store_id: storeId
      } as any,
      storeId,
      storeName
    )
    if (result === 'cross_store') onCrossStore?.()
  }

  const unavailable = !product.is_available || product.stock_qty <= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="relative h-48 bg-gray-50">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
        )}
        {unavailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-full">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        {product.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{product.description}</p>}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-indigo-600 text-lg">RM {product.price.toFixed(2)}</span>
          <button
            onClick={handleAdd}
            disabled={unavailable}
            className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
