import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BrandSettingsForm } from '@/components/merchant/settings/BrandSettingsForm'

export default async function BrandSettingsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, brand_primary_color, brand_secondary_color, brand_subdomain, brand_custom_domain, brand_app_name, brand_logo_url, brand_splash_url')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Brand Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Customise your white-label app and web storefront appearance
        </p>
      </div>
      <BrandSettingsForm store={store} />
    </div>
  )
}
