'use client'
import { formatDistanceToNow } from 'date-fns'
import type { MerchantNotification } from '@/hooks/useNotifications'

interface Props {
  notification: MerchantNotification
  primaryColor: string
  onClick: () => void
  onArchive: () => void
}

const TYPE_ICONS = {
  new_order: '🛒',
  low_stock: '⚠️',
  payment:   '💰',
  review:    '⭐',
  system:    '🔧',
  promo:     '🎁',
}

const TYPE_COLORS = {
  new_order: '#10B981',
  low_stock: '#F59E0B',
  payment:   '#3B82F6',
  review:    '#8B5CF6',
  system:    '#6B7280',
  promo:     '#EF4444',
}

export function NotificationItem({ notification, primaryColor, onClick, onArchive }: Props) {
  const { is_read, title, body, created_at, type } = notification

  return (
    <div
      onClick={onClick}
      className={`group relative flex gap-3.5 px-4 py-4 transition-all cursor-pointer border-l-2 ${
        is_read ? 'border-l-transparent bg-white hover:bg-gray-50' : `bg-gray-50/50 hover:bg-gray-50 shadow-sm border-l-[${primaryColor}]`
      }`}
      style={!is_read ? { borderLeftColor: primaryColor } : {}}
    >
      <div
        className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm border border-gray-100 bg-white group-hover:scale-105 transition-transform"
        style={{ borderColor: `${TYPE_COLORS[type]}40` }}
      >
        {TYPE_ICONS[type] || '🔔'}
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm leading-tight truncate ${is_read ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'}`}>
            {title}
          </p>
          {!is_read && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
          )}
        </div>
        
        {body && (
          <p className={`text-xs leading-relaxed mb-1.5 line-clamp-2 ${is_read ? 'text-gray-400 font-normal' : 'text-gray-500 font-medium'}`}>
            {body}
          </p>
        )}
        
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onArchive() }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-200/50 text-gray-400 transition-all scale-90 group-hover:scale-100"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
