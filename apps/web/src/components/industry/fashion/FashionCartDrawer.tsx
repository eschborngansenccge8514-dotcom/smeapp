'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore } from '@/stores/useCartStore'

interface Props {
  primaryColor: string
  isOpen: boolean
  onClose: () => void
}

export function FashionCartDrawer({ primaryColor, isOpen, onClose }: Props) {
  const router = useRouter()
  const { items, storeName, updateQuantity, getTotal, getItemCount } = useCartStore()
  const total = getTotal()
  const count = getItemCount()

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Shopping Bag</h2>
            {storeName && <p className="text-xs text-gray-400">{storeName}</p>}
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full"
                style={{ backgroundColor: primaryColor }}>
                {count}
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <p className="text-5xl mb-3">🛍️</p>
              <p className="font-semibold text-gray-700">Your bag is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add styles you love</p>
            </div>
          ) : items.map((item) => (
            <div key={item.id} className="flex gap-3 bg-gray-50 rounded-2xl p-3">
              <div className="relative w-16 shrink-0 rounded-xl overflow-hidden bg-white border border-gray-100"
                style={{ aspectRatio: '3/4' }}>
                {item.image_urls?.[0]
                  ? <Image src={item.image_urls[0]} alt={item.name} fill className="object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl text-gray-200">👗</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{item.name}</p>
                <p className="text-xs font-bold mt-1" style={{ color: primaryColor }}>
                  RM {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <div className="flex flex-col items-end justify-between shrink-0">
                <button onClick={() => updateQuantity(item.id, item.variant_id, 0)}
                  className="text-gray-300 hover:text-gray-500 text-sm">✕</button>
                <div className="flex items-center gap-1.5 border rounded-xl px-1.5 py-0.5"
                  style={{ borderColor: primaryColor }}>
                  <button onClick={() => updateQuantity(item.id, item.variant_id, item.quantity - 1)}
                    className="w-5 h-5 flex items-center justify-center font-bold text-xs"
                    style={{ color: primaryColor }}>−</button>
                  <span className="text-xs font-bold w-4 text-center text-gray-900">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.variant_id, item.quantity + 1)}
                    className="w-5 h-5 flex items-center justify-center font-bold text-xs text-white rounded-md"
                    style={{ backgroundColor: primaryColor }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal ({count} item{count !== 1 ? 's' : ''})</span>
              <span className="font-bold text-gray-900">RM {total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Shipping calculated at checkout
            </p>
            <button
              onClick={() => { onClose(); router.push('/checkout') }}
              className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-between px-5 transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Checkout</span>
              <span>RM {total.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
