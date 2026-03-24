import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StoreSettingsForm } from '@/components/merchant/settings/StoreSettingsForm'
import { OpeningHoursForm } from '@/components/merchant/settings/OpeningHoursForm'

export default async function StoreSettingsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('*').eq('owner_id', user.id).single()

  const { data: hours } = await supabase
    .from('store_hours').select('*').eq('store_id', store!.id).order('day_of_week')

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
      <StoreSettingsForm store={store} />
      <OpeningHoursForm storeId={store!.id} hours={hours ?? []} />
    </div>
  )
}
