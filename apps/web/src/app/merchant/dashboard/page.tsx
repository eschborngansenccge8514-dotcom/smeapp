import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/admin/ui/StatCard'
import { MerchantRevenueChart } from '@/components/merchant/dashboard/MerchantRevenueChart'
import { LiveOrderFeed } from '@/components/merchant/dashboard/LiveOrderFeed'
import { LowStockAlert } from '@/components/merchant/dashboard/LowStockAlert'
import { ShoppingBag, DollarSign, Users, Star, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default async function MerchantDashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()
  if (!store) redirect('/merchant/onboarding')

  const [
    kpiResult,
    { data: revenue },
    { data: recentOrders },
    { data: lowStock },
  ] = await Promise.all([
    supabase.rpc('get_merchant_kpi', { p_store_id: store.id }).single(),
    supabase.from('merchant_daily_revenue')
      .select('*').eq('store_id', store.id)
      .order('date', { ascending: true }).limit(30),
    supabase.from('orders')
      .select('*, profiles(full_name), order_items(count)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('products')
      .select('id, name, stock_qty, image_urls')
      .eq('store_id', store.id)
      .lte('stock_qty', 5)
      .eq('is_available', true)
      .order('stock_qty', { ascending: true })
      .limit(5),
  ])

  const kpi = kpiResult.data as any

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your store performance at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue Today" value={formatPrice(kpi?.revenue_today ?? 0)} icon={DollarSign} color="green" />
        <StatCard label="Orders Today" value={kpi?.orders_today ?? 0} icon={ShoppingBag} color="indigo" />
        <StatCard label="Net Revenue" value={formatPrice(kpi?.net_revenue ?? 0)} icon={TrendingUp} color="green" />
        <StatCard label="Avg Rating" value={`${Number(kpi?.avg_rating ?? 0).toFixed(1)} ⭐`} icon={Star} color="amber" />
        <StatCard label="Pending Orders" value={kpi?.pending_orders ?? 0} icon={ShoppingBag} color="amber" />
        <StatCard label="Total Customers" value={kpi?.total_customers ?? 0} icon={Users} color="indigo" />
        <StatCard label="Total Reviews" value={kpi?.total_reviews ?? 0} icon={Star} color="indigo" />
        <StatCard label="Low Stock Items" value={kpi?.low_stock_products ?? 0} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MerchantRevenueChart data={revenue ?? []} />
        </div>
        <LiveOrderFeed storeId={store.id} orders={recentOrders ?? []} />
      </div>

      {(lowStock?.length ?? 0) > 0 && <LowStockAlert products={lowStock ?? []} />}
    </div>
  )
}
