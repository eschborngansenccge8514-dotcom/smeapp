import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'

export default async function CheckoutPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/checkout')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <CheckoutForm user={user} profile={profile} />
    </div>
  )
}
