import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { Package, User, MapPin, Truck, Calendar, CreditCard, Store } from 'lucide-react'

export default async function MerchantOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(full_name, email, phone),
      order_items(*, products(name, image_urls))
    `)
    .eq('id', id)
    .eq('store_id', store!.id)
    .single()

  if (!order) notFound()

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/merchant/orders" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 font-bold text-gray-900">
              <Package size={18} />
              <h3>Items</h3>
            </div>
            <div className="space-y-4">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.products?.image_urls?.[0] ? (
                    <img src={item.products.image_urls[0]} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">📦</div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.products?.name}</p>
                    <p className="text-xs text-gray-500">RM {item.unit_price.toFixed(2)} × {item.quantity}</p>
                  </div>
                  <p className="font-bold text-gray-900">{formatPrice(item.total_price)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatPrice(order.total_amount - (order.delivery_fee || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery Fee</span>
                <span className="text-gray-900">{formatPrice(order.delivery_fee || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-indigo-600">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 font-bold text-gray-900">
              <User size={18} />
              <h3>Customer</h3>
            </div>
            <p className="font-semibold text-gray-900">{order.profiles?.full_name}</p>
            <p className="text-sm text-gray-500">{order.profiles?.email}</p>
            <p className="text-sm text-gray-500">{order.profiles?.phone}</p>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 font-bold text-gray-900">
              <MapPin size={18} />
              <h3>Delivery</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{order.delivery_address}</p>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {['self_pickup', 'pickup'].includes(order.delivery_type) ? (
                  <>
                    <Store size={14} className="text-green-600" />
                    <span className="font-medium text-green-700">Self Pickup</span>
                  </>
                ) : (
                  <>
                    <Truck size={14} />
                    <span>{order.delivery_type === 'lalamove' ? 'Lalamove' : order.courier_name || 'Standard'}</span>
                  </>
                )}
              </div>
              {order.tracking_number && (
                <p className="mt-1 text-xs font-mono text-indigo-600">Tracking: {order.tracking_number}</p>
              )}
            </div>
          </div>
          {/* Payment */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 font-bold text-gray-900">
              <CreditCard size={18} />
              <h3>Payment</h3>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 uppercase tracking-tight">
                {order.payment_method === 'manual' ? '💰 Manual Payment' : '💳 Billplz'}
              </p>
              <StatusBadge status={order.payment_status || 'pending'} />
            </div>
            {order.payment_method === 'manual' && (
              <p className="mt-2 text-xs text-gray-400 italic">Verify payment manually before processing</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
