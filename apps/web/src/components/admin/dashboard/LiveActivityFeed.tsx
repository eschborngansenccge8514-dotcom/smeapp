'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { timeAgo } from '@/lib/date'
import { StatusBadge } from '../ui/StatusBadge'

export function LiveActivityFeed({ orders: initialOrders }: { orders: any[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const channel = supabase
      .channel('admin-live-feed')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const { data } = await supabase
            .from('orders')
            .select('*, stores(name), profiles(full_name)')
            .eq('id', payload.new.id)
            .single()
          if (data) setOrders((prev) => [data, ...prev.slice(0, 9)])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Live Activity</h3>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-3 overflow-y-auto max-h-72">
        {orders.map((order) => (
          <div key={order.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
              <span className="text-sm">🛍️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                <span className="font-medium">{order.profiles?.full_name ?? 'Customer'}</span>
                {' ordered from '}
                <span className="font-medium">{order.stores?.name}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={order.status} />
                <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                <span className="text-xs font-medium text-gray-700">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
