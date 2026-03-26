import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { verifyXSignature } from '@repo/lib'
import { CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function CheckoutCompletePage({ searchParams }: Props) {
  const params = await searchParams
  const order_id = params['order_id']

  // Billplz appends its own params to our redirect URL (bracket notation: billplz[id], billplz[paid], …)
  // We must ONLY pass Billplz-generated params to verifyXSignature — our custom `order_id` must be excluded,
  // otherwise the HMAC will never match (Billplz didn't include order_id when it computed the signature).
  const billplzParams = Object.fromEntries(
    Object.entries(params).filter(([k]) => k.startsWith('billplz') || k === 'x_signature')
  )

  // Billplz redirect uses bracket notation: billplz[paid] = "true"
  const billplzPaid = billplzParams['billplz[paid]'] ?? billplzParams['billplz_paid']
  const hasSignature = 'x_signature' in billplzParams
  const isValid = hasSignature && verifyXSignature(billplzParams)
  const isPaid  = (isValid && billplzPaid === 'true') || params['paid'] === '1'

  if (!order_id) redirect('/')

  const supabase = await createSupabaseServer()
  const { data: order } = await supabase
    .from('orders')
    .select('*, stores(name, logo_url), order_items(*, products(name, image_urls))')
    .eq('id', order_id)
    .single()

  if (!order) redirect('/')

  // Also treat as paid if the webhook already confirmed the order in DB
  // (webhook often fires before the browser redirect completes)
  const isConfirmedInDb = order.status === 'confirmed' || order.status === 'delivered'
  const isManualPayment = order.payment_method === 'manual'
  if (isPaid || isConfirmedInDb || isManualPayment) {

    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed! 🎉</h1>
        <p className="text-gray-500 mb-1">
          {params['manual'] === '1' ? 'Your payment proof has been submitted' : (isManualPayment ? 'Please complete your manual payment' : 'Your payment was successful')}
        </p>
        <p className="text-sm text-gray-400 mb-6">Order #{order_id.slice(0, 8).toUpperCase()}</p>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left mb-6 space-y-3">
          <div className="flex items-center gap-3 mb-2">
            {order.stores?.logo_url && (
              <img src={order.stores.logo_url} className="w-9 h-9 rounded-xl object-cover" />
            )}
            <p className="font-semibold text-gray-900">{order.stores?.name}</p>
          </div>
          {order.order_items?.slice(0, 3).map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                {item.products?.image_urls?.[0] && (
                  <img src={item.products.image_urls[0]} className="w-full h-full object-cover" />
                )}
              </div>
              <span className="text-gray-700 flex-1">{item.products?.name}</span>
              <span className="text-gray-400">×{item.quantity}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link href={`/orders/${order_id}`}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 text-center">
            Track My Order →
          </Link>
          <Link href="/" className="w-full text-sm text-gray-500 hover:text-indigo-600">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <XCircle size={40} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
      <p className="text-gray-500 mb-6">Your payment was not completed. Your order has been cancelled.</p>
      <Link href="/cart"
        className="w-full inline-block bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700">
        Try Again
      </Link>
    </div>
  )
}
