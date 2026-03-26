'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { OrderCard } from './OrderCard'
import toast from 'react-hot-toast'

const PIPELINE_COLUMNS = [
  { status: 'pending',    label: '🕒 Pending',     color: 'border-yellow-200 bg-yellow-50' },
  { status: 'confirmed',  label: '✅ Confirmed',   color: 'border-blue-200 bg-blue-50'  },
  { status: 'preparing',  label: '👨‍🍳 Preparing',   color: 'border-orange-200 bg-orange-50' },
  { status: 'ready',      label: '📦 Ready',        color: 'border-indigo-200 bg-indigo-50' },
  { status: 'dispatched', label: '🛵 Dispatched',   color: 'border-purple-200 bg-purple-50' },
]

const NEXT_STATUS: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'dispatched',
  dispatched: 'delivered',
}

export function MerchantOrderPipeline({
  storeId, initialOrders
}: { storeId: string; initialOrders: any[] }) {
  const supabase = createSupabaseBrowser()
  const [orders, setOrders] = useState(initialOrders)

  useEffect(() => {
    const channel = supabase.channel(`pipeline-${storeId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase
            .from('orders')
            .select('*, profiles(full_name, phone), order_items(*, products(name, image_urls))')
            .eq('id', payload.new.id).single()
          if (data) {
            setOrders((prev) => [...prev, data])
            toast.success(`New order from ${data.profiles?.full_name}!`, { icon: '🛍️' })
          }
        } else if (payload.eventType === 'UPDATE') {
          // If status is changed to delivered or cancelled, remove from pipeline
          if (['delivered', 'cancelled'].includes(payload.new.status)) {
            setOrders((prev) => prev.filter((o) => o.id !== payload.new.id))
          } else {
            setOrders((prev) => prev.map((o) =>
              o.id === payload.new.id ? { ...o, ...payload.new } : o
            ))
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [storeId])

  async function advanceStatus(orderId: string, currentStatus: string) {
    const nextStatus = NEXT_STATUS[currentStatus]
    if (!nextStatus) return
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)
    if (error) toast.error(error.message)
  }

  async function cancelOrder(orderId: string, reason: string) {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
    toast.success('Order cancelled')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {PIPELINE_COLUMNS.map(({ status, label, color }) => {
        const columnOrders = orders.filter((o) => o.status === status)
        return (
          <div key={status} className={`rounded-2xl border-2 p-3 min-h-[300px] ${color}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">{label}</span>
              <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                {columnOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {columnOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAdvance={() => advanceStatus(order.id, order.status)}
                  onCancel={(reason) => cancelOrder(order.id, reason)}
                />
              ))}
              {columnOrders.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No orders</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
