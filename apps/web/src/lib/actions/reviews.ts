'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ReviewInput {
  product_id: string
  store_id: string
  order_id: string
  rating: number
  title?: string
  body?: string
}

export async function submitReview(input: ReviewInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('product_reviews')
    .upsert({
      ...input,
      customer_id: user.id,
      updated_at: new Date().toISOString()
    })

  if (error) throw error

  revalidatePath('/account/reviews')
  revalidatePath(`/orders/${input.order_id}`)
  return { success: true }
}

export async function getMyReviews() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('product_reviews')
    .select(`
      *,
      products ( name, image_url ),
      stores ( name, slug )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
