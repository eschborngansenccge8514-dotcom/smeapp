'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function NewOrderListener({ storeId }: { storeId: string }) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
    const supabase = createClient()

    const channel = supabase
      .channel(`merchant-orders-${storeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, () => {
        audioRef.current?.play().catch(() => {})
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [storeId, router])

  return null
}
