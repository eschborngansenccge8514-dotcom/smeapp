import { createSupabaseServer } from '@/lib/supabase/server'
import { OrdersTable } from '@/components/admin/orders/OrdersTable'

const STATUSES = ['all','pending','confirmed','preparing','ready','dispatched','delivered','cancelled']

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>
}) {
  const { status, q, from, to } = await searchParams
  const supabase = await createSupabaseServer()

  let query = supabase
    .from('orders')
    .select(`
      *,
      stores(name, logo_url),
      profiles(full_name, phone),
      payments(status, razorpay_payment_id),
      order_items(count)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') query = query.eq('status', status)
  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59')
  if (q)    query = query.or(`id.ilike.%${q}%`)

  const { data: orders } = await query

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-1">{orders?.length ?? 0} orders found</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <a
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize
              ${(status ?? 'all') === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s}
          </a>
        ))}
      </div>

      <OrdersTable orders={orders ?? []} />
    </div>
  )
}
