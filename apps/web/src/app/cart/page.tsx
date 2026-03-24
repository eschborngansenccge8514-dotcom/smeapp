'use client'
import { useCartStore } from '@/stores/useCartStore'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const { items, storeName, updateQuantity, removeItem, clearCart, getTotal } = useCartStore()
  const router = useRouter()

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <p className="text-6xl mb-4">🛒</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
      <Link href="/" className="mt-4 text-indigo-600 font-medium hover:underline">Browse stores</Link>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-indigo-600">← Continue Shopping</Link>
          <span className="font-bold ml-auto">Your Cart</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {storeName && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm">From <strong>{storeName}</strong></p>
            <button onClick={() => { if (confirm('Clear cart?')) clearCart() }} className="text-red-500 text-sm hover:underline">Clear Cart</button>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.productId} className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-indigo-600 font-bold">RM {item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200">−</button>
                <span className="w-6 text-center font-bold">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white hover:bg-indigo-700">+</button>
              </div>
              <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors text-xl ml-1">✕</button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
            <span>Total</span>
            <span className="text-indigo-600">RM {getTotal().toFixed(2)}</span>
          </div>
          <button onClick={() => router.push('/checkout')} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </main>
  )
}
