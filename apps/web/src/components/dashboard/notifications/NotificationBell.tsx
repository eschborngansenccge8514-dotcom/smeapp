'use client'
import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'

interface Props {
  storeId: string
  primaryColor: string
}

export function NotificationBell({ storeId, primaryColor }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const {
    notifications, loading, unreadCount,
    markAsRead, markAllAsRead, archiveNotification,
  } = useNotifications(storeId)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          open ? 'bg-gray-100' : 'hover:bg-gray-100'
        }`}
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-xs font-bold flex items-center justify-center px-1 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          unreadCount={unreadCount}
          primaryColor={primaryColor}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onArchive={archiveNotification}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
