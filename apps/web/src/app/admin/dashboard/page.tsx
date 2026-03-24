import { createSupabaseServer } from '@/lib/supabase/server'
import { StatCard } from '@/components/admin/ui/StatCard'
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart'
import { LiveActivityFeed } from '@/components/admin/dashboard/LiveActivityFeed'
import { PendingApprovals } from '@/components/admin/dashboard/PendingApprovals'
import {
  ShoppingBag, Store, Users, DollarSign,
  AlertTriangle, TrendingUp, Clock
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServer()

  const [
    { data: kpi },
    { data: dailyRevenue },
    { data: pendingStores },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('admin_kpi_summary').select('*').single(),
    supabase.from('admin_daily_revenue').select('*').limit(30).order('date', { ascending: true }),
    supabase.from('stores').select('*, profiles(full_name, phone)')
      .eq('is_active', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('orders')
      .select('*, stores(name), profiles(full_name)')
      .order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview · live data</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatPrice(kpi?.total_gross_revenue ?? 0)}
          icon={DollarSign}
          color="green"
          trend={{ value: 12, label: 'vs last week' }}
        />
        <StatCard
          label="Platform Fees"
          value={formatPrice(kpi?.total_platform_fees ?? 0)}
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          label="Orders Today"
          value={kpi?.orders_last_24h ?? 0}
          icon={ShoppingBag}
          color="indigo"
          trend={{ value: 8, label: 'vs yesterday' }}
        />
        <StatCard
          label="Revenue Today"
          value={formatPrice(kpi?.revenue_last_24h ?? 0)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Active Stores"
          value={kpi?.active_stores ?? 0}
          icon={Store}
          color="indigo"
        />
        <StatCard
          label="Pending Approvals"
          value={kpi?.pending_store_approvals ?? 0}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Total Customers"
          value={kpi?.total_customers ?? 0}
          icon={Users}
          color="indigo"
        />
        <StatCard
          label="Open Disputes"
          value={kpi?.open_disputes ?? 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={dailyRevenue ?? []} />
        </div>
        <div>
          <LiveActivityFeed orders={recentOrders ?? []} />
        </div>
      </div>

      {/* Pending Store Approvals */}
      {(pendingStores?.length ?? 0) > 0 && (
        <PendingApprovals stores={pendingStores ?? []} />
      )}
    </div>
  )
}
