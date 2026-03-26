import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'

export default async function AccountDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: storeCustomers } = await supabase
    .from('store_customers')
    .select('total_orders, total_spent, loyalty_points')
    .eq('user_id', user.id)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, stores(name, logo_url)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const totalOrders = storeCustomers?.reduce((sum, sc) => sum + sc.total_orders, 0) ?? 0
  const totalPoints = storeCustomers?.reduce((sum, sc) => sum + sc.loyalty_points, 0) ?? 0

  const stats = [
    { label: 'Orders', value: totalOrders, icon: '📦' },
    { label: 'Wishlist', value: '...', icon: '❤️' }, 
    { label: 'Points', value: totalPoints, icon: '💎' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm overflow-hidden relative">
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="w-24 h-24 rounded-full border-4 border-indigo-50 overflow-hidden bg-gray-100 group relative">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name || ''} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl bg-indigo-50 text-indigo-200 font-bold">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Hello, {profile?.full_name?.split(' ')[0] || 'User'}! 👋</h1>
            <p className="text-gray-500 mt-1 italic italic">Welcome back to your dashboard.</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
              {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm font-bold text-gray-900">{s.value}</span>
                  <span className="text-xs text-gray-400 font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
          <Link href="/orders" className="text-sm font-bold text-indigo-600 hover:underline">View all →</Link>
        </div>

        {orders && orders.length > 0 ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-indigo-100 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                    {order.stores?.logo_url ? (
                      <Image src={order.stores.logo_url} alt={order.stores.name} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🏪</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{order.stores?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">#{order.id.slice(0, 8)} • {format(new Date(order.created_at), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">RM {order.total_amount.toFixed(2)}</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${
                    order.status === 'delivered' ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 italic">No orders yet.</p>
            <Link href="/" className="mt-4 inline-block px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">Start Shopping</Link>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/account/profile" className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors group">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">👤</div>
          <h3 className="font-bold text-gray-900">Profile Settings</h3>
          <p className="text-sm text-gray-400 mt-1">Update your personal information and password</p>
        </Link>
        <Link href="/account/addresses" className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors group">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📍</div>
          <h3 className="font-bold text-gray-900">Address Book</h3>
          <p className="text-sm text-gray-400 mt-1">Manage your saved delivery addresses</p>
        </Link>
      </div>
    </div>
  )
}
