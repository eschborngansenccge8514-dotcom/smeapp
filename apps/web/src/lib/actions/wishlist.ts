'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleWishlist(productId: string, storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('customer_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('wishlists')
      .delete()
      .eq('id', existing.id)
    
    revalidatePath('/account/wishlist')
    return { wishlisted: false }
  } else {
    await supabase
      .from('wishlists')
      .insert({
        customer_id: user.id,
        product_id: productId,
        store_id: storeId
      })
    
    revalidatePath('/account/wishlist')
    return { wishlisted: true }
  }
}

export async function getWishlistIds() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('wishlists')
    .select('product_id')
    .eq('customer_id', user.id)

  return data?.map(i => i.product_id) ?? []
}
