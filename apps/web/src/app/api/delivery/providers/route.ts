import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/delivery/providers?storeId=xxx
 * Returns which delivery providers a store has enabled + free-delivery threshold.
 * This is a cheap DB-only read — no external API calls.
 */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const admin = createSupabaseAdmin()
  const { data: store, error } = await admin
    .from('stores')
    .select(`
      delivery_enabled_lalamove,
      delivery_enabled_easyparcel,
      delivery_enabled_self_pickup,
      delivery_free_threshold
    `)
    .eq('id', storeId)
    .single()

  if (error || !store) {
    // Return safe defaults so the UI still renders something
    return NextResponse.json({
      enabledProviders: { lalamove: true, easyparcel: true, self_pickup: true },
      freeThreshold: null,
    })
  }

  return NextResponse.json({
    enabledProviders: {
      lalamove:    store.delivery_enabled_lalamove    ?? true,
      easyparcel:  store.delivery_enabled_easyparcel  ?? true,
      self_pickup: store.delivery_enabled_self_pickup ?? true,
    },
    freeThreshold: store.delivery_free_threshold ?? null,
  })
}
