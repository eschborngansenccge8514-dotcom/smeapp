import { createSupabaseServer } from '@/lib/supabase/server'
import { PayoutsTable } from '@/components/admin/payouts/PayoutsTable'

export default async function AdminPayoutsPage() {
  const supabase = await createSupabaseServer()
  const { data: payouts } = await supabase
    .from('payouts')
    .select('*, stores(name, logo_url)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payout Tracking</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor merchant revenue distributions</p>
      </div>
      <PayoutsTable payouts={payouts ?? []} />
    </div>
  )
}
