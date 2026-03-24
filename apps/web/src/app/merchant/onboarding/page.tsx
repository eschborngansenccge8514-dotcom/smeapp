import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/merchant/onboarding/OnboardingForm'

export default async function MerchantOnboardingPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existingStore } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  if (existingStore) redirect('/merchant/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-xl w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Store</h1>
          <p className="text-gray-500 mt-1">This takes less than 2 minutes</p>
        </div>
        <OnboardingForm userId={user.id} />
      </div>
    </div>
  )
}
