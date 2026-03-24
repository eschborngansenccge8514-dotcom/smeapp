import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingProgress } from '@/components/merchant-signup/onboarding/OnboardingProgress'
import { Step1Profile } from '@/components/merchant-signup/onboarding/Step1Profile'

export const metadata = { title: 'Onboarding — Your Profile' }

export default async function OnboardingStep1() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/merchant-signup')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, phone, onboarding_done').eq('id', user.id).single()

  if (profile?.onboarding_done) redirect('/merchant/dashboard')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <OnboardingProgress currentStep={1} />
      <Step1Profile userId={user.id} initialData={{ full_name: profile?.full_name, phone: profile?.phone }} />
    </div>
  )
}
