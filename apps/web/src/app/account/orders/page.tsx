import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { Package, Calendar, ArrowRight, User } from 'lucide-react'

export default async function AccountOrdersPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account/orders')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, stores(name, logo_url)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your marketplace purchases</p>
        </div>
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
          <Package size={24} />
        </div>
      </div>

      <div className="space-y-4">
        {orders && orders.length > 0 ? (
          orders.map((order) => (
            <Link 
              key={order.id} 
              href={`/orders/${order.id}`}
              className="group block bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 hover:border-indigo-100 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                    {order.stores?.logo_url ? (
                      <img src={order.stores.logo_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                      {order.stores?.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-medium font-mono uppercase tracking-wider">
                        #{order.id.slice(0, 8)}
                      </div>
                      <div className="w-1 h-1 bg-gray-200 rounded-full" />
                      <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <Calendar size={12} />
                        {new Date(order.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Status</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total</p>
                    <p className="font-extrabold text-gray-900 text-lg">{formatPrice(order.total_amount)}</p>
                  </div>
                  <div className="hidden md:flex w-10 h-10 rounded-full bg-gray-50 items-center justify-center text-gray-300 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-20 border border-dashed border-gray-200 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package size={40} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto">Items you purchase from stores will appear here for tracking.</p>
            <Link href="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
