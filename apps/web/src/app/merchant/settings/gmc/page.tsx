import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GmcClient from './GmcClient'

export default async function MerchantGMCPage() {
  const supabase = await createSupabaseServer()

  // Ensure owner
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!store) redirect('/')

  // Get sync stats for this store
  const { data: products } = await supabase
    .from('products')
    .select('gmc_status')
    .eq('store_id', store.id)

  const gmcStats = {
    synced:  products?.filter(p => p.gmc_status === 'synced').length ?? 0,
    pending: products?.filter(p => p.gmc_status === 'pending').length ?? 0,
    failed:  products?.filter(p => p.gmc_status === 'failed').length ?? 0,
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <GmcClient store={store} gmcStats={gmcStats} />
    </div>
  )
}
