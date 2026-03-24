import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order, OrderItem, Product } from '@repo/lib/types'

export interface OrderDetail extends Order {
  order_items: (OrderItem & { products: Product })[]
  stores: { name: string; address: string | null; logo_url: string | null }
}

export function useOrder(orderId: string | null) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return

    // Initial fetch
    supabase
      .from('orders')
      .select(`
        *,
        order_items ( *, products(*) ),
        stores ( name, address, logo_url )
      `)
      .eq('id', orderId)
      .single()
      .then(({ data }) => { setOrder(data as OrderDetail); setLoading(false) })

    // Realtime subscription
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => setOrder((prev) => prev ? { ...prev, ...payload.new } : null)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  return { order, loading }
}
