'use client'
import { useCartStore } from '@/stores/cartStore'
import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Store } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { items, storeName, removeItem, updateQuantity, getTotal, clearCart } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="text-7xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some items from your favourite store</p>
        <Link href="/"
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-indigo-700">
          Browse Stores
        </Link>
      </div>
    )
  }

  const subtotal = getTotal()
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cart ({itemCount} items)</h1>
        <button onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-600">Clear cart</button>
      </div>

      {/* Store badge */}
      {storeName && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          <Store size={16} className="text-indigo-500" />
          <span>Ordering from <strong>{storeName}</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={`${item.id}_${item.variant_id ?? 'base'}`}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-4">
              <div className="relative w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                {item.image_urls?.[0]
                  ? <Image src={item.image_urls[0]} alt={item.name} fill className="object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 leading-snug truncate">{item.name}</p>
                <p className="text-indigo-600 font-bold mt-0.5">{formatPrice(item.price)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, item.variant_id, item.quantity - 1)}
                      className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.variant_id, item.quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      disabled={item.quantity >= item.stock_qty}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id, item.variant_id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  <span className="ml-auto font-bold text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-fit sticky top-20">
          <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({itemCount} items)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Delivery fee</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="border-t border-gray-100 pt-2.5 flex justify-between font-bold text-gray-900">
              <span>Estimated Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
          <Link href="/checkout"
            className="mt-5 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 transition-colors">
            Proceed to Checkout <ArrowRight size={17} />
          </Link>
          <Link href={`/store/${items[0]?.store_id}`}
            className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-indigo-600 hover:underline">
            <ShoppingBag size={14} /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
