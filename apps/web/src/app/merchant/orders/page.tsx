import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MerchantOrderPipeline } from '@/components/merchant/orders/MerchantOrderPipeline'

export default async function MerchantOrdersPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(full_name, phone),
      order_items(*, products(name, image_urls))
    `)
    .eq('store_id', store!.id)
    .not('status', 'in', '("delivered","cancelled")')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Live order pipeline</p>
        </div>
        <a href="/merchant/orders?view=history"
          className="text-sm text-indigo-600 hover:underline">Order history →</a>
      </div>
      <MerchantOrderPipeline storeId={store!.id} initialOrders={orders ?? []} />
    </div>
  )
}
