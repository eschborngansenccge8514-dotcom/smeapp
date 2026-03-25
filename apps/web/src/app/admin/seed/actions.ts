'use server'

import { createSupabaseServer } from '@/lib/supabase/server'
import { SEED_DATA } from './data'
import { revalidatePath } from 'next/cache'

export async function seedProducts(category: string) {
  const supabase = await createSupabaseServer()
  const data = SEED_DATA[category as keyof typeof SEED_DATA]

  if (!data) {
    return { error: 'Invalid category' }
  }

  // 1. Find a store with this category
  let { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('category', category)
    .limit(1)
    .single()

  if (storeError || !store) {
    // 2. Create a demo store if none exists
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { error: 'Unauthorized' }

    const { data: newStore, error: createStoreError } = await supabase
      .from('stores')
      .insert({
        name: `Sample ${category.replace(/[^a-zA-Z]/g, '')} Store`,
        category: category,
        owner_id: userData.user.id,
        is_active: true,
        approval_status: 'approved',
        brand_primary_color: '#6366F1'
      })
      .select('id')
      .single()

    if (createStoreError) {
      console.error('Error creating store:', createStoreError)
      return { error: 'Failed to create sample store' }
    }
    store = newStore
  }

  // 3. Prepare product data with store_id
  const productsToInsert = data.map(item => ({
    ...item,
    store_id: store.id
  }))

  // 4. Insert products
  const { error: insertError } = await supabase
    .from('products')
    .insert(productsToInsert)

  if (insertError) {
    console.error('Error inserting products:', insertError)
    return { error: 'Failed to insert products' }
  }

  revalidatePath('/admin/seed')
  revalidatePath('/admin/stores')
  return { success: true, count: data.length }
}
