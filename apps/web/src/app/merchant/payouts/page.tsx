import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { Wallet, TrendingUp, History } from 'lucide-react'

export default async function MerchantPayoutsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  const { data: kpiResult } = await supabase.rpc('get_merchant_kpi', { p_store_id: store!.id }).single()
  const kpi = kpiResult as any

  // Get delivered orders to show payout history
  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at, total_amount, status')
    .eq('store_id', store!.id)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">Earnings balance and payout history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-2xl p-6 shadow-sm border border-indigo-700 text-white col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <h3 className="font-bold">Available Balance</h3>
          </div>
          <p className="text-3xl font-bold">{formatPrice(kpi?.net_revenue ?? 0)}</p>
          <p className="text-xs text-indigo-200 mt-1">After 10% platform commission</p>
          <button className="mt-6 w-full bg-white text-indigo-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            Request Payout
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
             <TrendingUp size={18} className="text-green-500" />
            <span className="text-sm font-medium text-gray-500">Gross Earnings</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(kpi?.gross_revenue ?? 0)}</p>
          <p className="text-xs text-green-600 mt-1">+8% since last month</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4 font-bold text-gray-900">
          <History size={18} />
          <h3>Payout History (Delivered Orders)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-medium">
                <th className="pb-3 pr-4">Order ID</th>
                <th className="pb-3 px-4">Date</th>
                <th className="pb-3 px-4 text-right">Gross</th>
                <th className="pb-3 pl-4 text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-500">#{o.id.slice(0, 8)}</td>
                  <td className="py-3 px-4 text-gray-600">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatPrice(o.total_amount)}</td>
                  <td className="py-3 pl-4 text-right font-bold text-green-600">{formatPrice(o.total_amount * 0.90)}</td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr>
                   <td colSpan={4} className="py-10 text-center text-gray-400">No payout history found yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
