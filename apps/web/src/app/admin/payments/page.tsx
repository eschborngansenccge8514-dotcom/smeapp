import { createSupabaseServer } from '@/lib/supabase/server'
import { PaymentsTable } from '@/components/admin/payments/PaymentsTable'

export default async function AdminPaymentsPage() {
  const supabase = await createSupabaseServer()
  const { data: payments } = await supabase
    .from('payments')
    .select('*, orders(id, store_id, stores(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments Architecture</h1>
        <p className="text-gray-500 text-sm mt-1">Transaction logs and platform fee auditing</p>
      </div>
      <PaymentsTable payments={payments ?? []} />
    </div>
  )
}
