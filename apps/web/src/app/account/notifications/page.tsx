import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('customer_notifications')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Stay updated on your order status and promotions</p>
      </div>

      <div className="space-y-3">
        {notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className={`p-5 rounded-2xl border transition-all ${
                n.is_read ? 'bg-white border-gray-100 opacity-75' : 'bg-indigo-50/30 border-indigo-100 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xl shrink-0 shadow-sm">
                  {n.metadata?.icon || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{n.title}</h3>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                      {format(new Date(n.created_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{n.body}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🔔</div>
            <h3 className="text-lg font-bold text-gray-900">No notifications</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">We'll let you know when something important happens.</p>
          </div>
        )}
      </div>
    </div>
  )
}
