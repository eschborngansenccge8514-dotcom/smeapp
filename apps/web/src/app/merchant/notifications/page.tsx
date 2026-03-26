'use client'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { NotificationSettings } from '@/components/dashboard/notifications/NotificationSettings'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/dashboard/notifications/NotificationItem'

export default function NotificationsPage() {
  const [store, setStore] = useState<any>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    async function getStore() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', user.id)
          .single()
        setStore(data)
      }
    }
    getStore()
  }, [supabase])

  const {
    notifications, loading, markAsRead, archiveNotification,
  } = useNotifications(store?.id)

  if (!store) return <div className="p-8 animate-pulse bg-gray-50 rounded-3xl h-64" />

  const primaryColor = store.brand_primary_color || '#6366F1'

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col gap-2">
         <h1 className="text-4xl font-black text-gray-900 tracking-tight">Notification Center</h1>
         <p className="text-gray-500 font-medium">Manage how you receive updates and view your history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                 <h3 className="font-bold text-gray-900">Recent Activity</h3>
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{notifications.length} Total</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {loading ? (
                   Array.from({ length: 4 }).map((_, i) => (
                     <div key={i} className="p-4 animate-pulse"><div className="h-12 bg-gray-100 rounded-2xl"/></div>
                   ))
                ) : notifications.length === 0 ? (
                   <div className="py-20 text-center text-gray-400 font-bold">No notifications yet.</div>
                ) : (
                   notifications.map((n) => (
                     <NotificationItem
                        key={n.id}
                        notification={n}
                        primaryColor={primaryColor}
                        onClick={() => markAsRead(n.id)}
                        onArchive={() => archiveNotification(n.id)}
                     />
                   ))
                )}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <NotificationSettings storeId={store.id} primaryColor={primaryColor} />
           
           <div className="bg-indigo-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <span className="text-3xl mb-4 block">📱</span>
                <h3 className="text-xl font-bold mb-2">Mobile Push</h3>
                <p className="text-indigo-100/70 text-sm font-medium leading-relaxed mb-6">Get instant alerts on your phone even when you're away from the dashboard.</p>
                <button className="w-full py-3.5 bg-white text-indigo-900 rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                   Enable Push Alerts
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
