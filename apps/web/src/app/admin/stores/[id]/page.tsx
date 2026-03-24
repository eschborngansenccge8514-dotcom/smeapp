import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { formatDate } from '@/lib/date'
import { formatPrice } from '@/lib/utils'
import { Store, User, Phone, MapPin, Package, Clock } from 'lucide-react'

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: store } = await supabase
    .from('stores')
    .select('*, profiles(*), orders(*, profiles(full_name))')
    .eq('id', id)
    .single()

  if (!store) notFound()

  const stats = {
    totalOrders: store.orders?.length ?? 0,
    totalRevenue: store.orders?.filter((o: any) => o.status === 'delivered')
      .reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) ?? 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">
            {store.logo_url ? <img src={store.logo_url} className="w-full h-full rounded-2xl object-cover" /> : '🏪'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            <p className="text-sm text-gray-500 capitalize">{store.category} · Store ID: {store.id.slice(0, 8)}</p>
          </div>
        </div>
        <StatusBadge status={store.is_active ? 'active' : 'pending'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Store Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-indigo-600">{formatPrice(stats.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Status</p>
                <StatusBadge status={store.is_active ? 'active' : 'pending'} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Joined</p>
                <p className="text-sm font-medium text-gray-700">{formatDate(store.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Recent Orders</h2>
            <div className="space-y-4">
              {store.orders?.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs">🛍️</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{order.profiles?.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">{formatPrice(order.total_amount)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 whitespace-nowrap">Owner Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User size={16} className="text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">{store.profiles?.full_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">{store.profiles?.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600 line-clamp-1">{store.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
