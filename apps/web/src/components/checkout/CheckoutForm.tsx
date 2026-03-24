'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import { formatPrice } from '@/lib/utils'
import { Loader2, Lock } from 'lucide-react'

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any
  }
}

export function CheckoutForm({ user, profile }: { user: any; profile: any }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const { items, storeId, getTotal, clearCart } = useCartStore()

  const [address, setAddress] = useState('')
  const [postcode, setPostcode] = useState('')
  const [state, setState] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [store, setStore] = useState<any>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const subtotal = getTotal()
  const serviceFee = parseFloat((subtotal * 0.02).toFixed(2))
  const total = subtotal + serviceFee

  // Load Razorpay checkout.js script
  useEffect(() => {
    if (document.getElementById('razorpay-script')) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)
  }, [])

  // Fetch store details for distance entries
  useEffect(() => {
    if (!storeId) return
    supabase.from('stores').select('*').eq('id', storeId).single()
      .then(({ data }) => setStore(data))
  }, [storeId])

  function getDeliveryType() {
    return 'lalamove'
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (address.trim().length < 5) e.address = 'Enter a full delivery address'
    if (!/^\d{5}$/.test(postcode.trim())) e.postcode = 'Enter a valid 5-digit postcode'
    if (state.trim().length < 2) e.state = 'Enter your state'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCheckout() {
    if (!validate() || !scriptLoaded) return
    if (items.length === 0) return
    setLoading(true)

    try {
      // 1. Create order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          store_id: storeId,
          status: 'pending',
          delivery_address: [address.trim(), postcode.trim(), state.trim()].filter(Boolean).join(', '),
          delivery_lat: 0,
          delivery_lng: 0,
          delivery_type: getDeliveryType(),
          total_amount: total,
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Insert order items
      await supabase.from('order_items').insert(
        items.map((item) => ({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        }))
      )

      // 3. Call Edge Function to create Curlec order
      const { data: paymentData, error: fnError } = await supabase.functions.invoke(
        'create-payment',
        { body: { orderId: order.id } }
      )
      if (fnError || paymentData?.error) throw new Error(paymentData?.error ?? fnError?.message)

      // 4. Open Razorpay Web Checkout
      const options = {
        key: paymentData.key_id,
        order_id: paymentData.razorpay_order_id,
        amount: paymentData.amount_sen,
        currency: 'MYR',
        name: store?.name ?? 'MyMarketplace',
        description: `Order #${order.id.slice(0, 8).toUpperCase()}`,
        image: store?.logo_url ?? '',
        prefill: {
          name: profile?.full_name ?? '',
          email: user.email ?? '',
          contact: profile?.phone ?? '',
        },
        notes: { order_id: order.id },
        theme: { color: '#6366F1' },
        handler: async (response: any) => {
          // Payment captured — webhook will confirm order
          // Redirect immediately; status updates via Realtime
          clearCart()
          router.push(`/order/${order.id}?paid=1`)
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setLoading(false)
          },
        },
      }


      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error)
        setLoading(false)
        alert(`Payment failed: ${response.error.description}`)
      })
      razorpay.open()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
      setLoading(false)
    }
  }



  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🛒</p>
        <p className="text-gray-500">Your cart is empty</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Delivery Address */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-lg mb-4">📍 Delivery Address</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Full Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300
                ${errors.address ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="No. 12, Jalan Harmoni 3/1, Taman Harmoni"
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Postcode</label>
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300
                  ${errors.postcode ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="47810"
                maxLength={5}
              />
              {errors.postcode && <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300
                  ${errors.state ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Selangor"
              />
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Leave at door, no spicy..."
            />
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-lg mb-4">💳 Payment Summary</h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={`${item.id}-${item.variant_id ?? 'none'}-${i}`} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.name} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service Fee (2%)</span>
              <span>{formatPrice(serviceFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery Fee</span>
              <span className="text-amber-500 font-medium">Quoted after placement</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>Total (excl. delivery)</span>
              <span className="text-indigo-600">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment methods badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['FPX', 'Visa', 'Mastercard', "Touch'n Go", 'Boost', 'GrabPay'].map((m) => (
            <span key={m} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Pay Button */}
      <button
        onClick={handleCheckout}
        disabled={loading || !scriptLoaded}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold text-base
          hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={20} className="animate-spin" /> Processing...</>
        ) : (
          <><Lock size={18} /> Pay {formatPrice(total)} Securely</>
        )}
      </button>
      <p className="text-center text-xs text-gray-400">
        🔒 Secured by Razorpay Curlec · FPX · Cards · E-Wallets
      </p>
    </div>
  )
}
