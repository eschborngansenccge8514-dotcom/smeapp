'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore } from '@/stores/useCartStore'

interface Props {
  primaryColor: string
  isOpen: boolean       // mobile-only toggle
  onClose: () => void
  minOrderAmount?: number | null
}

export function GroceryCartSidebar({ primaryColor, isOpen, onClose, minOrderAmount }: Props) {
  const router = useRouter()
  const { items, storeName, updateQuantity, getTotal, getItemCount } = useCartStore()
  const total = getTotal()
  const count = getItemCount()
  const meetsMin = !minOrderAmount || total >= minOrderAmount
  const shortfall = minOrderAmount ? minOrderAmount - total : 0

  const CartContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛒</span>
          <div>
            <p className="font-bold text-gray-900">Your Basket</p>
            {storeName && <p className="text-xs text-gray-400">{storeName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
              style={{ backgroundColor: primaryColor }}>
              {count} item{count !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs">
            ✕
          </button>
        </div>
      </div>

      {/* Minimum order notice */}
      {minOrderAmount && !meetsMin && count > 0 && (
        <div className="mx-3 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-500 font-bold text-xs">⚠ Min. Order RM {minOrderAmount.toFixed(2)}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${Math.min((total / minOrderAmount) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-amber-600 mt-1">
            Add RM {shortfall.toFixed(2)} more to checkout
          </p>
        </div>
      )}

      {/* Met min order badge */}
      {minOrderAmount && meetsMin && count > 0 && (
        <div className="mx-3 mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-green-500 text-sm">✅</span>
          <p className="text-xs text-green-700 font-semibold">Minimum order met!</p>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-5xl mb-3">🛒</p>
            <p className="font-semibold text-gray-700">Your basket is empty</p>
            <p className="text-gray-400 text-sm mt-1">Browse departments and add items</p>
          </div>
        ) : items.map((item) => (
          <div key={item.id}
            className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-2.5">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-gray-100">
              {item.image_urls?.[0]
                ? <Image src={item.image_urls[0]} alt={item.name} fill className="object-contain p-1" />
                : <div className="w-full h-full flex items-center justify-center text-lg">🛒</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                {item.name}
              </p>
              <p className="text-xs font-bold mt-0.5" style={{ color: primaryColor }}>
                RM {(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => updateQuantity(item.id, item.variant_id ?? null, item.quantity - 1)}
                className="w-6 h-6 rounded-lg border font-bold text-xs flex items-center justify-center transition-colors"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                −
              </button>
              <span className="w-5 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.variant_id ?? null, item.quantity + 1)}
                className="w-6 h-6 rounded-lg font-bold text-xs text-white flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="px-4 py-4 border-t border-gray-100 space-y-3 bg-white">
          {/* Savings summary */}
          {items.some((i) => (i as any).originalPrice) && (
            <div className="flex justify-between text-xs">
              <span className="text-green-600 font-semibold">🎉 You're saving</span>
              <span className="text-green-600 font-bold">
                RM {items.reduce((s, i) => s + (((i as any).originalPrice ?? i.price) - i.price) * i.quantity, 0).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{count} item{count !== 1 ? 's' : ''}</span>
            <span className="font-bold text-gray-900">RM {total.toFixed(2)}</span>
          </div>

          <button
            onClick={() => { onClose(); router.push('/checkout') }}
            disabled={!meetsMin}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-between px-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Checkout</span>
            <span>RM {total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop — always visible sidebar */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-[113px] self-start max-h-[calc(100vh-130px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <CartContent />
      </aside>

      {/* Mobile — slide-in drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm lg:hidden" onClick={onClose} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col lg:hidden">
            <CartContent />
          </div>
        </>
      )}
    </>
  )
}
