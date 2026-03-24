import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MerchantRevenueChart } from '@/components/merchant/dashboard/MerchantRevenueChart'
import { formatPrice } from '@/lib/utils'

export default async function MerchantAnalyticsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  const [
    { data: revenue },
    { data: topProducts },
  ] = await Promise.all([
    supabase.from('merchant_daily_revenue')
      .select('*').eq('store_id', store!.id)
      .order('date', { ascending: true }).limit(30),
    supabase.from('merchant_top_products')
      .select('*').eq('store_id', store!.id)
      .order('total_revenue', { ascending: false }).limit(10),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Insights into your store's performance</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MerchantRevenueChart data={revenue ?? []} />

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Top 10 Products by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-medium">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 px-4">Sold</th>
                  <th className="pb-3 pl-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts?.map((p) => (
                  <tr key={p.product_id}>
                    <td className="py-3 pr-4 flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">📦</div>
                      )}
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{p.total_units_sold}</td>
                    <td className="py-3 pl-4 text-right font-bold text-indigo-600">{formatPrice(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
