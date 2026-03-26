import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoyaltySettingsForm } from '@/components/merchant/settings/LoyaltySettingsForm'
import { Trophy } from 'lucide-react'

export const metadata = {
  title: 'Loyalty Program Settings | Merchant Dashboard',
  description: 'Configure your customer loyalty points and rewards system.',
}

export default async function LoyaltySettingsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return <div>Store not found.</div>
  }

  // Fetch or create loyalty program settings
  let { data: program } = await supabase
    .from('loyalty_programs')
    .select('*')
    .eq('store_id', store.id)
    .single()

  if (!program) {
    // We can either create it here or handle it in the form
    // Let's create a default one if it doesn't exist
    const { data: newProgram, error: createError } = await supabase
      .from('loyalty_programs')
      .insert({ 
        store_id: store.id,
        is_enabled: false,
        base_points_per_myr: 1,
        max_redeem_pct: 20,
        points_per_myr_redeem: 100
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating default loyalty program:', JSON.stringify(createError))
    } else {
      program = newProgram
    }
  }

  const { data: tiers } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .eq('store_id', store.id)
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
           <Trophy size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
          <p className="text-gray-500 mt-1">Configure your reward points and membership tiers to drive repeat business.</p>
        </div>
      </div>

      <LoyaltySettingsForm storeId={store.id} initialProgram={program} initialTiers={tiers || []} />
    </div>
  )
}
