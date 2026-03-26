import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { DEFAULT_FEE_CONFIG } from '@/lib/fees'
import type { FeeConfig } from '@/types/customer'

// Fetch per-store fee config (falls back to platform default)
export const getStoreFeeConfig = unstable_cache(
  async (storeId: string): Promise<FeeConfig> => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('store_settings')
      .select('service_fee_rate, service_fee_cap, service_fee_label, free_delivery_threshold, min_order_amount')
      .eq('store_id', storeId)
      .single()
    return { ...DEFAULT_FEE_CONFIG, ...data }
  },
  ['store-fee-config'],
  { revalidate: 3600, tags: ['store-settings'] }
)
