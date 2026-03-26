import { createClient } from '@/lib/supabase/server'
import type { StoreCustomer, LoyaltyTransaction } from '@/types/customer'

/**
 * Get store-scoped customer data for the current user
 */
export async function getStoreCustomer(storeId: string): Promise<StoreCustomer | null> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('store_customers')
    .select('*')
    .eq('user_id', user.id)
    .eq('store_id', storeId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching store customer:', error)
    return null
  }

  return data
}

/**
 * Get loyalty transactions for a specific store
 */
export async function getStoreLoyaltyTransactions(storeId: string): Promise<LoyaltyTransaction[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching loyalty transactions:', error)
    return []
  }

  return data || []
}

/**
 * Check if a customer is blocked in a specific store
 */
export async function isCustomerBlocked(storeId: string): Promise<boolean> {
  const customer = await getStoreCustomer(storeId)
  return customer?.is_blocked ?? false
}
