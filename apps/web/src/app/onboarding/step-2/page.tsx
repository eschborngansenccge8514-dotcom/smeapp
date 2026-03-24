import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingProgress } from '@/components/merchant-signup/onboarding/OnboardingProgress'
import { Step2Store } from '@/components/merchant-signup/onboarding/Step2Store'

export const metadata = { title: 'Onboarding — Store Details' }

export default async function OnboardingStep2() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/merchant-signup')

  const { data: profile } = await supabase
    .from('profiles').select('onboarding_step, onboarding_done').eq('id', user.id).single()

  if (profile?.onboarding_done) redirect('/merchant/dashboard')
  if ((profile?.onboarding_step ?? 0) < 2) redirect('/onboarding/step-1')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <OnboardingProgress currentStep={2} />
      <Step2Store userId={user.id} storeId={store?.id} />
    </div>
  )
}
