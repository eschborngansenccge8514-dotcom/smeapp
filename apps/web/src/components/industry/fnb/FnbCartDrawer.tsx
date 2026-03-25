'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore } from '@/stores/useCartStore'

export function FnbCartDrawer({ primaryColor, isOpen, onClose }: {
  primaryColor: string; isOpen: boolean; onClose: () => void
}) {
  const router = useRouter()
  const { items, storeName, updateQuantity, removeItem, getTotal, getItemCount } = useCartStore()
  const count = getItemCount()
  const total = getTotal()

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Your Order</h2>
            {storeName && <p className="text-sm text-gray-500">from {storeName}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <p className="text-5xl mb-3">🛒</p>
              <p className="font-semibold text-gray-700">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add items from the menu</p>
            </div>
          ) : items.map((item) => (
            <div key={`${item.id}_${item.variant_id ?? 'base'}`} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                {item.image_urls?.[0]
                  ? <Image src={item.image_urls[0]} alt={item.name} fill className="object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">🍜</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                <p className="font-bold text-sm" style={{ color: primaryColor }}>
                  RM {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateQuantity(item.id, item.variant_id, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border font-bold text-sm flex items-center justify-center"
                  style={{ borderColor: primaryColor, color: primaryColor }}>−</button>
                <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.variant_id, item.quantity + 1)}
                  className="w-7 h-7 rounded-full font-bold text-sm text-white flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{count} item{count !== 1 ? 's' : ''}</span>
              <span className="font-bold text-gray-900">RM {total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { onClose(); router.push('/checkout') }}
              className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-between px-5 transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}>
              <span>Proceed to Checkout</span>
              <span>RM {total.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
