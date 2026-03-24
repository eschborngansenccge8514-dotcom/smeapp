import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow'

export default async function CheckoutPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/checkout')

  const [{ data: addresses }, { data: profile }] = await Promise.all([
    supabase.from('addresses').select('*')
      .eq('customer_id', user.id).order('is_default', { ascending: false }),
    supabase.from('profiles').select('full_name, phone, email').eq('id', user.id).single(),
  ])

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <CheckoutFlow addresses={addresses ?? []} profile={profile} userId={user.id} />
    </div>
  )
}
