import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/merchant-signup')

  const { data: profile } = await supabase
    .from('profiles').select('onboarding_step, onboarding_done').eq('id', user.id).single()

  if (profile?.onboarding_done) redirect('/merchant/dashboard')

  const step = profile?.onboarding_step ?? 1
  if (step >= 3) redirect('/onboarding/step-3')
  if (step >= 2) redirect('/onboarding/step-2')
  redirect('/onboarding/step-1')
}
