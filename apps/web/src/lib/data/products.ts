import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/types/customer'

export async function getStoreProducts(
  storeId: string,
  page: number = 1,
  pageSize: number = 20,
  category?: string,
  query?: string
): Promise<{ products: Product[]; hasMore: boolean }> {
  const supabase = await createClient()
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

  if (error) return { products: [], hasMore: false }
  
  const products = (data || []) as any[]
  return {
    products: products.slice(0, pageSize),
    hasMore: products.length > pageSize
  }
}
