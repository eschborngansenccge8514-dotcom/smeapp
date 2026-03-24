import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MerchantSidebar } from '@/components/merchant/MerchantSidebar'
import { MerchantHeader } from '@/components/merchant/MerchantHeader'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/merchant/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'merchant') redirect('/')

  // Fetch merchant's store
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, logo_url, is_active')
    .eq('owner_id', user.id)
    .single()

  // No store yet → redirect to onboarding
  if (!store && !children?.toString().includes('onboarding')) {
    redirect('/merchant/onboarding')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {store && <MerchantSidebar store={store} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {store && <MerchantHeader profile={profile} store={store} />}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
