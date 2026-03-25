import { createSupabaseServer } from '@/lib/supabase/server'
import { GMCSyncPanel } from '@/components/admin/GMCSyncPanel'
import { redirect } from 'next/navigation'

export default async function AdminGMCPage() {
  const supabase = await createSupabaseServer()

  // Ensure admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const [
    { data: syncStats },
    { data: recentLogs },
    { data: failedProducts }
  ] = await Promise.all([
    supabase.rpc('get_gmc_sync_stats' as any),
    supabase
      .from('gmc_sync_log')
      .select('*, products(name, stores(name))')
      .order('synced_at', { ascending: false })
      .limit(50),
    supabase
      .from('products')
      .select('id, name, gmc_status, gmc_synced_at, stores(name)')
      .eq('gmc_status', 'failed')
      .order('gmc_synced_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Google Merchant Center</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your product feed and sync status with Google Shopping
        </p>
      </div>
      <GMCSyncPanel
        stats={syncStats}
        recentLogs={recentLogs ?? []}
        failedProducts={failedProducts ?? []}
      />
    </div>
  )
}
