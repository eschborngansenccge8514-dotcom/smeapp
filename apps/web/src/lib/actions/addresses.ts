'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Address } from '@/types/customer'

export async function getAddresses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function saveAddress(address: Address) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const data = {
    ...address,
    customer_id: user.id,
    updated_at: new Date().toISOString()
  }

  if (address.id) {
    const { error } = await supabase
      .from('customer_addresses')
      .update(data)
      .eq('id', address.id)
    if (error) throw error
  } else {
    // If it's the first address, make it default
    const countRes = await supabase
      .from('customer_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', user.id)
    
    if (countRes.count === 0) data.is_default = true

    const { error } = await supabase
      .from('customer_addresses')
      .insert(data)
    if (error) throw error
  }

  revalidatePath('/account/addresses')
  revalidatePath('/checkout')
  return { success: true }
}

export async function deleteAddress(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', id)
  if (error) throw error

  revalidatePath('/account/addresses')
  return { success: true }
}

export async function setDefaultAddress(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Transaction-like update: set all to false, then one to true
  await supabase
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', user.id)

  const { error } = await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', id)

  if (error) throw error
  revalidatePath('/account/addresses')
  return { success: true }
}
