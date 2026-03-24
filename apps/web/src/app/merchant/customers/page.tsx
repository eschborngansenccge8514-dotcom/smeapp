import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

export default async function MerchantCustomersPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  // Get customers who have ordered from this store
  const { data: customers } = await supabase
    .from('orders')
    .select('customer_id, profiles(id, full_name, email, phone, avatar_url), total_amount, status')
    .eq('store_id', store!.id)
    .eq('status', 'delivered')

  // Group by customer_id
  const customerSummary = customers?.reduce((acc: any, order: any) => {
    const cid = order.profiles?.id
    if (!cid) return acc
    if (!acc[cid]) {
      acc[cid] = {
        name: order.profiles.full_name,
        email: order.profiles.email,
        phone: order.profiles.phone,
        avatar_url: order.profiles.avatar_url,
        orderCount: 0,
        totalSpent: 0,
      }
    }
    acc[cid].orderCount += 1
    acc[cid].totalSpent += order.total_amount
    return acc
  }, {})

  const customersList = Object.values(customerSummary || {}).sort((a: any, b: any) => b.totalSpent - a.totalSpent)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">Customers who have ordered from you</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-medium">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 px-4">Contact</th>
                <th className="pb-3 px-4">Orders</th>
                <th className="pb-3 pl-4 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customersList.map((c: any) => (
                <tr key={c.email}>
                  <td className="py-3 pr-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{c.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <p className="text-xs">{c.email}</p>
                    <p className="text-xs">{c.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{c.orderCount}</td>
                  <td className="py-3 pl-4 text-right font-bold text-indigo-600">{formatPrice(c.totalSpent)}</td>
                </tr>
              ))}
              {customersList.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400">No customers found yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
