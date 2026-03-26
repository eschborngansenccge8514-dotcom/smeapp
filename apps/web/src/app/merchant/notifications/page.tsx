'use client'
import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/dashboard/notifications/NotificationItem'
import { NotificationSettings } from '@/components/dashboard/notifications/NotificationSettings'
import { useDashboardStore } from '@/hooks/useDashboardStore'

const TABS = [
  { value: 'all',      label: 'All',      icon: '🔔' },
  { value: 'new_order',label: 'Orders',   icon: '🛒' },
  { value: 'low_stock',label: 'Stock',    icon: '⚠️' },
  { value: 'payment',  label: 'Payments', icon: '💰' },
  { value: 'review',   label: 'Reviews',  icon: '⭐' },
  { value: 'system',   label: 'System',   icon: '🔧' },
  { value: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function MerchantNotificationsPage() {
  const { store, primaryColor } = useDashboardStore()
  const [tab, setTab] = useState('all')
  const {
    notifications, loading, unreadCount,
    markAsRead, markAllAsRead, archiveNotification,
  } = useNotifications(store?.id || '')

  const filtered = tab === 'all' || tab === 'settings'
    ? notifications
    : notifications.filter((n) => n.type === tab)

  if (!store) return <div className="p-8 animate-pulse bg-gray-50 rounded-[40px] h-[600px]" />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
              🔔 Notifications
              {unreadCount > 0 && (
                <span
                  className="text-xs font-black px-2.5 py-0.5 rounded-full text-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              Stay on top of orders, stock, and customer activity
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-black uppercase tracking-widest hover:underline active:scale-95 transition-all"
              style={{ color: primaryColor }}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-8 pb-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold border-2 transition-all ${
                tab === t.value ? 'text-white border-transparent shadow-lg' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
              }`}
              style={tab === t.value ? { backgroundColor: primaryColor } : {}}
            >
              <span className="text-base">{t.icon}</span>
              <span className="uppercase tracking-widest">{t.label}</span>
              {t.value !== 'settings' && t.value !== 'all' && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  tab === t.value ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {notifications.filter((n) => n.type === t.value && !n.is_read).length || ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'settings' ? (
          <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-gray-100">⚙️</div>
               <div>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">Notification Preferences</h2>
                  <p className="text-sm text-gray-400 font-medium">Configure how and when you receive alerts.</p>
               </div>
            </div>
            <NotificationSettings storeId={store.id} primaryColor={primaryColor} />
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-4 px-8 py-6 animate-pulse">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-50 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-50 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-32">
                <p className="text-6xl mb-6">✨</p>
                <p className="font-black text-gray-900 text-xl tracking-tight">All caught up!</p>
                <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto font-medium">No notifications in this category. You're doing great!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    primaryColor={primaryColor}
                    onClick={() => markAsRead(n.id)}
                    onArchive={() => archiveNotification(n.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
