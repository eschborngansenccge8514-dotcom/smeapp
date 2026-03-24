import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RealtimeOrderStatus } from '@/components/RealtimeOrderStatus'

const STEPS = ['pending','confirmed','preparing','ready','dispatched','delivered'] as const
const STEP_INFO: Record<string, { icon: string; label: string }> = {
  pending:    { icon: '⏳', label: 'Order Placed' },
  confirmed:  { icon: '✅', label: 'Confirmed' },
  preparing:  { icon: '👨‍🍳', label: 'Preparing' },
  ready:      { icon: '📦', label: 'Ready' },
  dispatched: { icon: '🛵', label: 'On the Way' },
  delivered:  { icon: '🎉', label: 'Delivered' },
}

export default async function OrderStatusPage({ 
  params: paramsPromise,
  searchParams: searchParamsPromise
}: { 
  params: Promise<{ id: string }> 
  searchParams: Promise<{ payment?: string }>
}) {
  const params = await paramsPromise
  const searchParams = await searchParamsPromise
  const paymentStatus = searchParams.payment

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name)), stores(name, address)')
    .eq('id', params.id)
    .single()

  if (!order) notFound()

  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number])

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/account/orders" className="text-gray-500 hover:text-indigo-600">← My Orders</Link>
          <span className="font-bold ml-auto">Order Status</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Payment Status Banner */}
        {paymentStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-4">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-green-800">Payment Successful!</p>
              <p className="text-green-600 text-sm">Your order is confirmed and being processed.</p>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-bold text-red-800">Payment Failed</p>
              <p className="text-red-600 text-sm">Please try again or contact support if your account was charged.</p>
            </div>
          </div>
        )}

        {/* Live Status */}
        <div className="bg-indigo-600 text-white rounded-2xl p-6 text-center">
          <p className="text-4xl mb-2">{STEP_INFO[order.status]?.icon ?? '📋'}</p>
          <div className="flex items-center justify-center gap-2">
            <RealtimeOrderStatus initialStatus={order.status} orderId={order.id} />
          </div>
        </div>

        {/* Progress Steps */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="font-bold text-gray-900 mb-4">Order Progress</p>
            <div className="space-y-3">
              {STEPS.map((step, idx) => {
                const done = idx <= currentStep
                const active = idx === currentStep
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <span className={`text-sm ${active ? 'text-indigo-600 font-semibold' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                      {STEP_INFO[step]?.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tracking */}
        {order.tracking_number && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="font-bold text-gray-900 mb-1">📦 Tracking Number</p>
            <p className="font-mono text-indigo-600">{order.tracking_number}</p>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="font-bold text-gray-900 mb-3">Order Summary</p>
          {(order.order_items as any[])?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-700">{item.quantity}× {item.products?.name}</span>
              <span>RM {(item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-base pt-3">
            <span>Total</span>
            <span className="text-indigo-600">RM {order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
