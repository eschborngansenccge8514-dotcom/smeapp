import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'

export default async function AccountOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account/orders')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, stores(name)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="text-gray-500 hover:text-indigo-600 mr-4">← Home</Link>
          <span className="font-bold">My Orders</span>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {orders?.length ? orders.map((order: any) => (
          <Link key={order.id} href={`/order/${order.id}`}
            className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-gray-900">{order.stores?.name}</p>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-gray-500 text-sm">
              RM {order.total_amount.toFixed(2)} · {new Date(order.created_at).toLocaleDateString('en-MY')}
            </p>
          </Link>
        )) : (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500">No orders yet</p>
          </div>
        )}
      </div>
    </main>
  )
}
