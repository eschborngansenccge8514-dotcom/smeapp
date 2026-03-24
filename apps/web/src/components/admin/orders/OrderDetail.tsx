'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { StatusBadge } from '../ui/StatusBadge'
import { formatPrice } from '@/lib/utils'
import { formatDate } from '@/lib/date'
import toast from 'react-hot-toast'
import { Package, Truck, User, Store, CreditCard, ChevronDown } from 'lucide-react'

export function OrderDetail({ order }: { order: any }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [loading, setLoading] = useState(false)

  async function updateStatus(newStatus: string) {
    setLoading(true)
    const { error } = await supabase.rpc('admin_update_order_status' as any, {
      p_order_id: order.id,
      p_status: newStatus
    })
    if (error) toast.error(error.message)
    else {
      toast.success(`Order status updated to ${newStatus}`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0">
                    {item.products?.image_url ? (
                      <img src={item.products?.image_url} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-xl flex items-center justify-center text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.products?.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{item.products?.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatPrice(item.price_at_order * item.quantity)}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatPrice(item.price_at_order)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-50 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Admin Fee</span>
                  <span>{formatPrice(order.platform_fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-indigo-600 border-t border-gray-100 pt-2 mt-2">
                  <span>Grand Total</span>
                  <span>{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Update Status</h2>
            <div className="grid grid-cols-2 gap-2">
              {['pending','confirmed','preparing','ready','dispatched','delivered','cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={loading || order.status === s}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all
                    ${order.status === s
                      ? 'bg-indigo-600 text-white cursor-default'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Context</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <User size={18} className="text-gray-400 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer</p>
                  <p className="text-sm font-medium text-gray-900">{order.profiles?.full_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{order.profiles?.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Store size={18} className="text-gray-400 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Merchant</p>
                  <p className="text-sm font-medium text-gray-900">{order.stores?.name}</p>
                  <p className="text-xs text-gray-500 underline underline-offset-4">{order.stores?.profiles?.full_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CreditCard size={18} className="text-gray-400 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Status</p>
                  <StatusBadge status={order.payments?.[0]?.status ?? 'pending'} />
                  <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase">{order.payments?.[0]?.razorpay_payment_id}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Truck size={18} className="text-gray-400 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Delivery Context</p>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-lg capitalize">{order.delivery_type}</span>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-[200px]">{order.delivery_address?.name ?? 'No address provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
