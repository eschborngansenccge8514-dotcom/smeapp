import { createClient } from '@/lib/supabase/server'
import type { Store } from '@/types/customer'

export async function getStore(slug: string): Promise<Store | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .or(`slug.eq.${slug},custom_domain.eq.${slug}`)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as any
}
