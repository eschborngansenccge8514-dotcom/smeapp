import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('orders')
      .select(`
        *,
        stores(name, logo_url),
        order_items(*, products(name, image_url))
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data ?? [])
        setLoading(false)
      })
  }, [userId])

  return { orders, loading }
}

export function useOrder(orderId: string) {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    supabase
      .from('orders')
      .select(`
        *,
        stores(name, logo_url, address, phone),
        order_items(*, products(name, image_url, price))
      `)
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        setOrder(data)
        setLoading(false)
      })

    // Subscribe to real-time status updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => setOrder((prev: any) => ({ ...prev, ...payload.new }))
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  return { order, loading }
}
