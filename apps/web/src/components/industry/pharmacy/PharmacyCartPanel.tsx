'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore } from '@/stores/useCartStore'
import { RX_CONFIG } from '@/lib/industry/themes/pharmacy'

interface Props {
  primaryColor: string
  isOpen: boolean
  onClose: () => void
}

export function PharmacyCartPanel({ primaryColor, isOpen, onClose }: Props) {
  const router = useRouter()
  const { items, storeName, updateQuantity, getTotal, getItemCount } = useCartStore()
  const total = getTotal()
  const count = getItemCount()

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Your Cart</h2>
            {storeName && <p className="text-xs text-gray-400 mt-0.5">{storeName}</p>}
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: primaryColor }}>
                {count}
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              ✕
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <p className="text-5xl mb-3">💊</p>
              <p className="font-semibold text-gray-700">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add medicines to get started</p>
            </div>
          ) : items.map((item) => (
            <div key={item.id}
              className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-gray-100 flex items-center justify-center">
                {item.image_urls?.[0]
                  ? <Image src={item.image_urls[0]} alt={item.name} fill className="object-contain p-1" />
                  : <span className="text-xl">💊</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{item.name}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: primaryColor }}>
                  RM {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateQuantity(item.id, null, item.quantity - 1)}
                  className="w-6 h-6 rounded-lg border font-bold text-xs flex items-center justify-center"
                  style={{ borderColor: primaryColor, color: primaryColor }}>−</button>
                <span className="w-5 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, null, item.quantity + 1)}
                  className="w-6 h-6 rounded-lg font-bold text-xs text-white flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{count} item{count !== 1 ? 's' : ''}</span>
              <span className="font-bold text-gray-900">RM {total.toFixed(2)}</span>
            </div>
            <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <span className="text-blue-400 shrink-0 mt-0.5 text-xs">ℹ️</span>
              <p className="text-blue-600 text-xs">
                Prescription items will be verified by our pharmacist before dispatch.
              </p>
            </div>
            <button
              onClick={() => { onClose(); router.push('/checkout') }}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-between px-4 transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Proceed to Checkout</span>
              <span>RM {total.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
