'use client'
import { useState } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { formatPrice } from '@/lib/utils'
import { Loader2, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const PAYMENT_METHODS = [
  { code: 'billplz',  label: 'Choose at Billplz',      icon: '💳', desc: 'FPX, e-wallet, credit card' },
  { code: 'MB2U0227', label: 'Maybank2u',               icon: '🏦', desc: 'FPX Online Banking' },
  { code: 'BCBB0235', label: 'CIMB Clicks',             icon: '🏦', desc: 'FPX Online Banking' },
  { code: 'HLB0224',  label: 'Hong Leong Connect',      icon: '🏦', desc: 'FPX Online Banking' },
  { code: 'PBB0233',  label: 'Public Bank',             icon: '🏦', desc: 'FPX Online Banking' },
  { code: 'TOUCHNGO', label: 'Touch \'n Go eWallet',   icon: '🟢', desc: 'eWallet' },
  { code: 'BOOST',    label: 'Boost',                   icon: '🚀', desc: 'eWallet' },
]

export function PaymentStep({ userId, storeId, state, subtotal, serviceFee, total, items, onBack, store }: any) {
  const { clearCart } = useCartStore()
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState<string | null>('billplz')
  const [loading, setLoading] = useState(false)

  async function placeOrder() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          items,
          address:        state.address,
          deliveryType:   state.deliveryType,
          deliveryFee:    state.deliveryFee,
          deliveryQuote:  state.deliveryQuote,
          promotionId:    state.promotionId,
          discountAmount: state.discountAmount,
          notes:          state.notes,
          subtotal,
          serviceFee,
          total,
          loyaltyPoints: state.loyaltyPoints,
          paymentMethod: selectedMethod,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      clearCart()

      if (selectedMethod === 'manual') {
        router.push(`/checkout/complete?order_id=${data.orderId}`)
        return
      }

      // Redirect to Billplz payment page
      // Append bank code for direct payment if selected
      const isDirectBank = selectedMethod && selectedMethod !== 'billplz' && selectedMethod !== 'manual'
      const billUrl = isDirectBank
        ? `${data.billUrl}?auto_submit=true&bank_code=${selectedMethod}`
        : data.billUrl

      window.location.href = billUrl
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
      <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
        <CreditCard size={20} className="text-indigo-500" /> Payment Method
      </h2>

      {/* Payment method selector */}
      <div className="space-y-2">
        {PAYMENT_METHODS.filter(m => (store?.accepts_billplz ?? true) || m.code === 'manual').map((m) => (
          <button key={m.code ?? 'default'}
            onClick={() => setSelectedMethod(m.code)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-colors
              ${selectedMethod === m.code ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
          >
            <span className="text-2xl">{m.icon}</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">{m.label}</p>
              <p className="text-xs text-gray-400">{m.desc}</p>
            </div>
          </button>
        ))}

        {store?.accepts_manual_payment && (
          <button
            onClick={() => setSelectedMethod('manual')}
            className={`w-full flex flex-col gap-2 p-3.5 rounded-2xl border-2 text-left transition-colors
              ${selectedMethod === 'manual' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="font-semibold text-sm text-gray-900">Manual Payment</p>
                <p className="text-xs text-gray-400">Bank Transfer / Cash</p>
              </div>
            </div>
            {selectedMethod === 'manual' && store.manual_payment_instructions && (
              <div className="mt-2 p-3 bg-white border border-indigo-100 rounded-xl text-xs text-gray-600 leading-relaxed whitespace-pre-wrap italic">
                {store.manual_payment_instructions}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Order Total Summary */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery</span><span>{formatPrice(state.deliveryFee)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Service fee (2%)</span><span>{formatPrice(serviceFee)}</span>
        </div>
        {state.discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo ({state.promoCode})</span>
            <span>−{formatPrice(state.discountAmount)}</span>
          </div>
        )}
        {state.loyaltyDiscount > 0 && (
          <div className="flex justify-between text-indigo-600">
            <span>Loyalty Points ({state.loyaltyPoints} pts)</span>
            <span>−{formatPrice(state.loyaltyDiscount)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base text-gray-900">
          <span>Total</span><span className="text-indigo-700">{formatPrice(total)}</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        🔒 Payments are securely processed by Billplz. You will be redirected to complete payment.
      </p>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="px-5 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
          ← Back
        </button>
        <button onClick={placeOrder} disabled={loading}
          className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : `Pay ${formatPrice(total)} →`}
        </button>
      </div>
    </div>
  )
}
