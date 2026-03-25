import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { getLalamoveQuote, getEasyParcelRates } from '@repo/lib'

export async function POST(req: NextRequest) {
  const { storeId, address } = await req.json()
  const admin = createSupabaseAdmin()

  const { data: store } = await admin
    .from('stores')
    .select(`
      id, name, address, lat, lng, state, postcode,
      delivery_enabled_lalamove,
      delivery_enabled_easyparcel,
      delivery_enabled_self_pickup,
      delivery_free_threshold,
      delivery_max_radius_km
    `)
    .eq('id', storeId).single()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const result: any = {
    // Always expose which providers the store has enabled so the UI can show/hide options
    enabledProviders: {
      lalamove:   store.delivery_enabled_lalamove   ?? true,
      easyparcel: store.delivery_enabled_easyparcel  ?? true,
      self_pickup: store.delivery_enabled_self_pickup ?? true,
    },
    freeThreshold: store.delivery_free_threshold ?? null,
  }

  // Calculate distance (simple Haversine)
  const distanceKm = address.lat && address.lng && store.lat && store.lng
    ? haversineKm(store.lat, store.lng, address.lat, address.lng)
    : null

  const maxRadius = store.delivery_max_radius_km ?? 30

  // Lalamove: enabled by merchant + within configured radius + coordinates known
  if (
    (store.delivery_enabled_lalamove ?? true) &&
    distanceKm !== null &&
    distanceKm <= maxRadius
  ) {
    try {
      const quote = await getLalamoveQuote({
        fromLat: store.lat, fromLng: store.lng,
        toLat: address.lat, toLng: address.lng,
        fromAddress: store.address,
        toAddress: `${address.address_line}, ${address.city}, ${address.state}`,
      })
      result.lalamove = {
        fee:     parseFloat((quote.data?.totalFee?.amount / 100).toFixed(2)),
        eta:     quote.data?.stops?.[1]?.normalEta ?? '45 min',
        quoteId: quote.data?.quotationId,
        distanceKm,
      }
    } catch (e) {
      console.warn('[Delivery Quote] Lalamove failed:', e)
    }
  }

  // EasyParcel: enabled by merchant + postcode data available
  if (store.delivery_enabled_easyparcel ?? true) {
    try {
      const rates = await getEasyParcelRates({
        fromPostcode: store.postcode ?? '50450',
        fromState:    store.state ?? 'Kuala Lumpur',
        toPostcode:   address.postcode,
        toState:      address.state,
        weight:       0.5, // default; caller can pass actual cart weight
      })
      if (rates.length > 0) {
        result.easyparcel = { options: rates.slice(0, 5) }
      }
    } catch (e) {
      console.warn('[Delivery Quote] EasyParcel failed:', e)
    }
  }

  return NextResponse.json(result)
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
