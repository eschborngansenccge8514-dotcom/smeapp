'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface MerchantNotification {
  id: string
  store_id: string
  type: 'new_order' | 'low_stock' | 'review' | 'payment' | 'system' | 'promo'
  title: string
  body: string | null
  link: string | null
  metadata: Record<string, any>
  is_read: boolean
  is_archived: boolean
  created_at: string
}

const PAGE_SIZE = 20

export function useNotifications(storeId: string) {
  const [notifications, setNotifications] = useState<MerchantNotification[]>([])
  const [loading, setLoading]             = useState(true)
  const [unreadCount, setUnreadCount]     = useState(0)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    if (!storeId) return
    const { data } = await supabase
      .from('merchant_notifications')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    }
    setLoading(false)
  }, [storeId, supabase])

  useEffect(() => {
    if (!storeId) return
    fetchNotifications()

    // Supabase Realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`notifications:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'merchant_notifications',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const n = payload.new as MerchantNotification
          setNotifications((prev) => [n, ...prev])
          setUnreadCount((c) => c + 1)
          // Browser push notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(n.title, { body: n.body ?? '', icon: '/favicon.ico' })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'merchant_notifications',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const updated = payload.new as MerchantNotification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          )
          setUnreadCount((prev) =>
            prev - (payload.old.is_read === false && updated.is_read === true ? 1 : 0)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [storeId, supabase, fetchNotifications])

  async function markAsRead(id: string) {
    await supabase
      .from('merchant_notifications')
      .update({ is_read: true })
      .eq('id', id)
  }

  async function markAllAsRead() {
    if (!storeId) return
    await supabase
      .from('merchant_notifications')
      .update({ is_read: true })
      .eq('store_id', storeId)
      .eq('is_read', false)
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  async function archiveNotification(id: string) {
    await supabase
      .from('merchant_notifications')
      .update({ is_archived: true })
      .eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  async function requestPushPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      await Notification.requestPermission()
    }
  }

  return {
    notifications, loading, unreadCount,
    markAsRead, markAllAsRead, archiveNotification,
    requestPushPermission, refresh: fetchNotifications,
  }
}
