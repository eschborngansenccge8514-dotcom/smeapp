'use server'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/types/customer'

export async function loadMoreProducts(
  storeId: string,
  page: number,
  query: string = '',
  category: string = ''
): Promise<{ products: Product[]; hasMore: boolean }> {
  const supabase = await createClient()
  const pageSize = 20
  const offset = (page - 1) * pageSize

  let q = supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_available', true)
    .order('name', { ascending: true })
    .range(offset, offset + pageSize)

  if (query) {
    q = q.ilike('name', `%${query}%`)
  }
  if (category && category !== 'All') {
    q = q.eq('category', category)
  }

  const { data, error } = await q

  if (error) {
    console.error('Error loading more products:', error)
    return { products: [], hasMore: false }
  }

  return {
    products: (data || []) as any[],
    hasMore: (data || []).length === pageSize + 1
  }
}
