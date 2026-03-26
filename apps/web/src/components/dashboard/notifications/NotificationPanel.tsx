'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NotificationItem } from './NotificationItem'
import type { MerchantNotification } from '@/hooks/useNotifications'

const TYPE_FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'new_order', label: '🛒 Orders' },
  { value: 'low_stock', label: '⚠️ Stock' },
  { value: 'payment',   label: '💰 Payments' },
  { value: 'review',    label: '⭐ Reviews' },
  { value: 'system',    label: '🔧 System' },
]

interface Props {
  notifications: MerchantNotification[]
  loading: boolean
  unreadCount: number
  primaryColor: string
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onArchive: (id: string) => void
  onClose: () => void
}

export function NotificationPanel({
  notifications, loading, unreadCount, primaryColor,
  onMarkRead, onMarkAllRead, onArchive, onClose,
}: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filtered = notifications.filter((n) => {
    if (filter !== 'all' && n.type !== filter) return false
    if (showUnreadOnly && n.is_read) return false
    return true
  })

  function handleClick(n: MerchantNotification) {
    if (!n.is_read) onMarkRead(n.id)
    if (n.link) { router.push(n.link); onClose() }
  }

  return (
    <div className="absolute right-0 top-11 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden max-h-[80vh]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => { router.push('/dashboard/notifications'); onClose() }}
            className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
          >
            See all →
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-none">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              filter === f.value
                ? 'text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={filter === f.value ? { backgroundColor: primaryColor } : {}}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setShowUnreadOnly((s) => !s)}
          className={`shrink-0 ml-auto px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            showUnreadOnly
              ? 'text-white border-transparent'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
          style={showUnreadOnly ? { backgroundColor: primaryColor } : {}}
        >
          Unread only
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-full" />
                <div className="h-2 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm text-gray-500 font-medium">No notifications</p>
            <p className="text-xs text-gray-400 mt-0.5">You're all caught up!</p>
          </div>
        ) : (
          filtered.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              primaryColor={primaryColor}
              onClick={() => handleClick(n)}
              onArchive={() => onArchive(n.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
