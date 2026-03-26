import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EinvoiceSettingsForm } from '@/components/merchant/settings/EinvoiceSettingsForm'

export default async function EinvoiceSettingsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return <div>Store not found</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-sans">e-Invoice Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your business details for LHDN MyInvois compliance. 
          This information will be used for all e-invoices issued by your store.
        </p>
      </div>
      <EinvoiceSettingsForm store={store} />
    </div>
  )
}
