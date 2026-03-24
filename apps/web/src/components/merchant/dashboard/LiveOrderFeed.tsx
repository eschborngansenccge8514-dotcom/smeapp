'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { formatPrice } from '@/lib/utils'
import { timeAgo } from '@/lib/date'

export function LiveOrderFeed({ storeId, orders: initialOrders }: { storeId: string; orders: any[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const channel = supabase.channel(`merchant-feed-${storeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('orders')
          .select('*, profiles(full_name), order_items(count)')
          .eq('id', payload.new.id)
          .single()
        if (data) setOrders((prev) => [data, ...prev.slice(0, 7)])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [storeId])

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Recent Orders</h3>
        <Link href="/merchant/orders" className="text-xs text-indigo-600 hover:underline">View all</Link>
      </div>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link key={order.id} href={`/merchant/orders/${order.id}`}>
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-lg shrink-0">
                🛍️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {order.profiles?.full_name}
                </p>
                <p className="text-xs text-gray-400">{timeAgo(order.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-indigo-600">{formatPrice(order.total_amount)}</p>
                <StatusBadge status={order.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
