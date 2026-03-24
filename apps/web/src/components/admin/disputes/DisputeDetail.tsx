'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { StatusBadge } from '../ui/StatusBadge'
import { formatPrice } from '@/lib/utils'
import { formatDate } from '@/lib/date'
import toast from 'react-hot-toast'

const RESOLUTIONS = [
  'Refund issued to customer',
  'Order confirmed as delivered',
  'Partial refund issued',
  'Merchant compensated customer directly',
  'No action required',
]

export function DisputeDetail({ dispute, messages }: { dispute: any; messages: any[] }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage() {
    if (!message.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('dispute_messages').insert({
      dispute_id: dispute.id,
      sender_id: user!.id,
      message: message.trim(),
      is_internal: isInternal,
    })
    if (error) {
      toast.error(error.message)
    } else {
      setMessage('')
      router.refresh()
    }
    setLoading(false)
  }

  async function updateStatus(newStatus: string) {
    const { error } = await supabase
      .from('disputes')
      .update({
        status: newStatus,
        resolution: newStatus === 'resolved' ? resolution : dispute.resolution,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', dispute.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Dispute marked as ${newStatus}`)
      router.refresh()
    }
  }

  async function issueRefund() {
    if (!confirm('Issue full refund to customer? This cannot be undone.')) return
    setLoading(true)
    // Update payment status to refunded
    const { error } = await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('order_id', dispute.order_id)
    if (!error) {
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', dispute.order_id)
      // Log admin action
      await supabase.rpc('log_admin_action' as any, {
        p_action: 'REFUND_ISSUED',
        p_target_type: 'payment',
        p_target_id: dispute.order_id,
        p_details: { dispute_id: dispute.id },
      })
      toast.success('Refund issued and order cancelled')
      router.refresh()
    } else {
      toast.error(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute</h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">#{dispute.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <StatusBadge status={dispute.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: dispute info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dispute info card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold mb-3">Dispute Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-gray-500 w-32">Raised by</span>
                <span className="font-medium">{dispute.profiles?.full_name}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-32">Order</span>
                <a
                  href={`/admin/orders/${dispute.order_id}`}
                  className="text-indigo-600 hover:underline font-mono"
                >
                  #{dispute.order_id.slice(0, 8).toUpperCase()}
                </a>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-32">Store</span>
                <span>{dispute.orders?.stores?.name}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-32">Order Amount</span>
                <span className="font-semibold text-indigo-600">
                  {formatPrice(dispute.orders?.total_amount)}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-32">Reason</span>
                <span className="font-medium">{dispute.reason}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-32">Filed</span>
                <span>{formatDate(dispute.created_at)}</span>
              </div>
              {dispute.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                  <p className="text-gray-700">{dispute.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Message thread */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4">Message Thread</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
              {messages.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-sm ${
                    msg.is_internal
                      ? 'bg-amber-50 border border-amber-200'
                      : msg.profiles?.role === 'admin'
                        ? 'bg-indigo-50'
                        : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {msg.profiles?.full_name}
                      {msg.is_internal && (
                        <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          Internal Note
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                  </div>
                  <p className="text-gray-700">{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Reply box */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-amber-600">Internal note (admin only)</span>
                </label>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={isInternal ? 'Add internal note...' : 'Reply to all parties...'}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !message.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold mb-4">Admin Actions</h3>
            <div className="space-y-2">
              {dispute.status === 'open' && (
                <button
                  onClick={() => updateStatus('under_review')}
                  className="w-full bg-amber-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-amber-600"
                >
                  Mark Under Review
                </button>
              )}

              <button
                onClick={issueRefund}
                disabled={loading}
                className="w-full bg-red-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                Issue Full Refund
              </button>

              <div className="mt-4">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Select resolution...</option>
                  {RESOLUTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => updateStatus('resolved')}
                disabled={!resolution}
                className="w-full bg-green-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => updateStatus('closed')}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                Close Without Action
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold mb-3">Disputed Order Items</h3>
            <div className="space-y-2">
              {dispute.orders?.order_items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.products?.name}</span>
                  <span className="font-medium">× {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
