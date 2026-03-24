import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PromotionsManager } from '@/components/merchant/promotions/PromotionsManager'

export default async function MerchantPromotionsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('store_id', store!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
        <p className="text-sm text-gray-500 mt-1">Create discount codes for your customers</p>
      </div>
      <PromotionsManager storeId={store!.id} promotions={promotions ?? []} />
    </div>
  )
}
