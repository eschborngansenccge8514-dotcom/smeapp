'use client'
import { useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import toast from 'react-hot-toast'

export function AddToCartButtonSimple({ product }: { product: any }) {
  const { addItem, storeId } = useCartStore()
  const [added, setAdded] = useState(false)

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // If cart has items from different store, prompt
    if (storeId && storeId !== product.store_id) {
      if (!confirm('Your cart has items from a different store. Clear cart and add this item?')) return
    }

    // If product has variants, redirect to product page
    if (product.product_variants && product.product_variants.length > 0) {
      window.location.href = `/store/${product.store_id}/product/${product.id}`
      return
    }

    addItem({ ...product, quantity: 1 }, product.store_id, product.store_name)
    setAdded(true)
    toast.success('Added to cart')
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
        ${added
          ? 'bg-green-500 text-white'
          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
    >
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
    </button>
  )
}
