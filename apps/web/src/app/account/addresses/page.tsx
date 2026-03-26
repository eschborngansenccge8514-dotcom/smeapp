import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddressList } from './AddressList'

export const metadata = { title: 'Address Book' }

export default async function AddressesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Address Book</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your delivery addresses for faster checkout</p>
        </div>
      </div>

      <AddressList initialAddresses={addresses || []} />
    </div>
  )
}
