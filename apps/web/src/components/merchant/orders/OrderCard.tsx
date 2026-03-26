'use client'
import Link from 'next/link'
import { ChevronRight, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { timeAgo } from '@/lib/date'

const ADVANCE_LABELS: Record<string, string> = {
  pending: 'Confirm Order',
  confirmed: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Dispatched',
  dispatched: 'Mark Delivered',
}

const PICKUP_ADVANCE_LABELS: Record<string, string> = {
  ...ADVANCE_LABELS,
  ready: 'Mark Picked Up',
}

export function OrderCard({
  order, onAdvance, onCancel
}: { order: any; onAdvance: () => void; onCancel: (reason: string) => void }) {
  function handleCancel() {
    const reason = prompt('Reason for cancelling?')
    if (reason) onCancel(reason)
  }

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-white">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{order.profiles?.full_name}</p>
          <p className="text-xs text-gray-400">{timeAgo(order.created_at)}</p>
        </div>
        <span className="font-bold text-sm text-indigo-600">{formatPrice(order.total_amount)}</span>
      </div>

      <div className="space-y-0.5 mb-3">
        {order.order_items?.slice(0, 3).map((item: any) => (
          <p key={item.id} className="text-xs text-gray-500">
            {item.products?.name} × {item.quantity}
          </p>
        ))}
        {order.order_items?.length > 3 && (
          <p className="text-xs text-gray-400">+{order.order_items.length - 3} more</p>
        )}
      </div>

      {order.delivery_type === 'lalamove' ? (
        <p className="text-xs text-purple-600 mb-2">🛵 Lalamove delivery</p>
      ) : ['self_pickup', 'pickup'].includes(order.delivery_type) ? (
        <p className="text-xs text-green-600 mb-2">🏪 Self Pickup</p>
      ) : (
        <p className="text-xs text-blue-600 mb-2">📦 {order.courier_name ?? 'EasyParcel'}</p>
      )}

      {order.payment_method === 'manual' && (
        <p className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full inline-block mb-2 uppercase tracking-tight border border-orange-100 italic">
          💰 Manual Payment
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onAdvance}
          className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700"
        >
          {['self_pickup', 'pickup'].includes(order.delivery_type)
            ? (PICKUP_ADVANCE_LABELS[order.status] ?? 'Advance')
            : (ADVANCE_LABELS[order.status] ?? 'Advance')
          }
        </button>
        <Link href={`/merchant/orders/${order.id}`}
          className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200">
          <ChevronRight size={14} />
        </Link>
        {['pending', 'confirmed'].includes(order.status) && (
          <button onClick={handleCancel}
            className="p-1.5 bg-red-50 rounded-lg text-red-500 hover:bg-red-100">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
