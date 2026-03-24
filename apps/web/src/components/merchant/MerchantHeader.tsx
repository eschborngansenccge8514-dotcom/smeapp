'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'

export function MerchantHeader({ profile, store }: { profile: any; store: any }) {
  const supabase = createSupabaseBrowser()
  const [newOrders, setNewOrders] = useState(0)

  useEffect(() => {
    // Live count of new (pending) orders
    const channel = supabase
      .channel('merchant-new-orders')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
        filter: `store_id=eq.${store.id}`,
      }, () => {
        setNewOrders((n) => n + 1)
        // Play notification sound
        new Audio('/sounds/order-bell.mp3').play().catch(() => {})
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [store.id])

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <Link href="/merchant/orders" onClick={() => setNewOrders(0)}>
          <button className="relative p-2 rounded-xl hover:bg-gray-50">
            <Bell size={20} className="text-gray-500" />
            {newOrders > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                {newOrders}
              </span>
            )}
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {profile?.full_name?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">{profile?.full_name}</span>
        </div>
      </div>
    </header>
  )
}
