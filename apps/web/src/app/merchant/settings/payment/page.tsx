import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PaymentSettingsForm } from '@/components/merchant/settings/PaymentSettingsForm'

export default async function PaymentSettingsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your bank details for receiving payouts.</p>
      </div>
      <PaymentSettingsForm store={store} />
    </div>
  )
}
