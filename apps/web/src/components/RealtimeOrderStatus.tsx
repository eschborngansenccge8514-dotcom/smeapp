'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderStatusBadge } from './OrderStatusBadge'

interface Props {
  initialStatus: string
  orderId: string
}

export function RealtimeOrderStatus({ initialStatus, orderId }: Props) {
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setStatus((payload.new as any).status)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  return <OrderStatusBadge status={status} />
}
