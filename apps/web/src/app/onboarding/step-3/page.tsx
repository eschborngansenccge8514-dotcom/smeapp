import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingProgress } from '@/components/merchant-signup/onboarding/OnboardingProgress'
import { Step3Brand } from '@/components/merchant-signup/onboarding/Step3Brand'

export const metadata = { title: 'Onboarding — Brand & Look' }

export default async function OnboardingStep3() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/merchant-signup')

  const { data: profile } = await supabase
    .from('profiles').select('onboarding_step, onboarding_done').eq('id', user.id).single()

  if (profile?.onboarding_done) redirect('/merchant/dashboard')
  if ((profile?.onboarding_step ?? 0) < 3) redirect('/onboarding/step-2')

  const { data: store } = await supabase
    .from('stores').select('id').eq('owner_id', user.id).single()

  if (!store) redirect('/onboarding/step-2')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <OnboardingProgress currentStep={3} />
      <Step3Brand userId={user.id} storeId={store.id} />
    </div>
  )
}
