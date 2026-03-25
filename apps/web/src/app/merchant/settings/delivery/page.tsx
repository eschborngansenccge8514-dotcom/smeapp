import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeliverySettingsForm } from '@/components/merchant/settings/DeliverySettingsForm'
import { Truck } from 'lucide-react'

export default async function DeliverySettingsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select(`
      id, lat, lng, postcode, state,
      delivery_enabled_lalamove,
      delivery_enabled_easyparcel,
      delivery_enabled_self_pickup,
      delivery_free_threshold,
      delivery_max_radius_km,
      delivery_note
    `)
    .eq('owner_id', user.id)
    .single()

  if (!store) redirect('/merchant/onboarding')

  const config = {
    lat:  store.lat  ?? null,
    lng:  store.lng  ?? null,
    postcode: store.postcode ?? '',
    state:    store.state    ?? '',
    delivery_enabled_lalamove:   store.delivery_enabled_lalamove   ?? true,
    delivery_enabled_easyparcel:  store.delivery_enabled_easyparcel  ?? true,
    delivery_enabled_self_pickup: store.delivery_enabled_self_pickup ?? true,
    delivery_free_threshold:  store.delivery_free_threshold  ?? null,
    delivery_max_radius_km:   store.delivery_max_radius_km   ?? null,
    delivery_note:            store.delivery_note            ?? '',
  }

  return (
    <div className="max-w-2xl space-y-2">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Truck size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Settings</h1>
          <p className="text-sm text-gray-400">
            Control which delivery options customers see at checkout.
          </p>
        </div>
      </div>

      <DeliverySettingsForm storeId={store.id} config={config} />
    </div>
  )
}
