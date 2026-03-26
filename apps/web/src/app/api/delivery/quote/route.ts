import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { getLalamoveQuote, getEasyParcelRates, geocodeAddress } from '@repo/lib'

export async function POST(req: NextRequest) {
  // `provider` is optional — if omitted, both are fetched (legacy behaviour)
  const { storeId, address, provider } = await req.json()
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

  // ── Geocode BOTH concurrently if missing coordinates ───────────────────────
  const [geoStoreRes, geoAddrRes] = await Promise.allSettled([
    !store.lat || !store.lng
      ? store.address ? geocodeAddress(store.address) : null
      : null,
    !address.lat || !address.lng
      ? address.address_line
        ? geocodeAddress(
            [address.address_line, address.postcode, address.city, address.state, 'Malaysia'].filter(Boolean).join(', ')
          )
        : null
      : null,
  ])

  let storeWithCoords = store as any
  if (geoStoreRes.status === 'fulfilled' && geoStoreRes.value) {
    storeWithCoords = { ...store, lat: geoStoreRes.value.lat, lng: geoStoreRes.value.lon }
    await admin.from('stores').update({ lat: geoStoreRes.value.lat, lng: geoStoreRes.value.lon }).eq('id', store.id)
  }

  let addrWithCoords = address
  if (geoAddrRes.status === 'fulfilled' && geoAddrRes.value) {
    addrWithCoords = { ...address, lat: geoAddrRes.value.lat, lng: geoAddrRes.value.lon }
    if (address.id) {
      await admin.from('addresses').update({ lat: geoAddrRes.value.lat, lng: geoAddrRes.value.lon }).eq('id', address.id)
    }
  }

  const result: any = {
    enabledProviders: {
      lalamove:    storeWithCoords.delivery_enabled_lalamove   ?? true,
      easyparcel:  storeWithCoords.delivery_enabled_easyparcel  ?? true,
      self_pickup: storeWithCoords.delivery_enabled_self_pickup ?? true,
    },
    freeThreshold: storeWithCoords.delivery_free_threshold ?? null,
  }

  const distanceKm = addrWithCoords.lat && addrWithCoords.lng && storeWithCoords.lat && storeWithCoords.lng
    ? haversineKm(storeWithCoords.lat, storeWithCoords.lng, addrWithCoords.lat, addrWithCoords.lng)
    : null
  const maxRadius = storeWithCoords.delivery_max_radius_km ?? 30
  const isLalamoveAllowed =
    (!provider || provider === 'lalamove') &&
    (storeWithCoords.delivery_enabled_lalamove ?? true) &&
    (distanceKm === null || distanceKm <= maxRadius)
  const isEasyParcelAllowed =
    (!provider || provider === 'easyparcel') &&
    (storeWithCoords.delivery_enabled_easyparcel ?? true)

  // ── Fetch quotes concurrently ──────────────────────────────────────────────
  const [lalamoveResult, easyparcelResult] = await Promise.allSettled([
    // LALAMOVE PROMISE
    isLalamoveAllowed ? (async () => {
      if (!storeWithCoords.lat || !storeWithCoords.lng || !addrWithCoords.lat || !addrWithCoords.lng) {
        throw new Error('Coordinates could not be resolved for this address. Please set lat/lng manually in your store delivery settings.')
      }
      const quote = await getLalamoveQuote({
        fromLat: storeWithCoords.lat, fromLng: storeWithCoords.lng,
        toLat: addrWithCoords.lat, toLng: addrWithCoords.lng,
        fromAddress: storeWithCoords.address,
        toAddress: `${addrWithCoords.address_line}, ${addrWithCoords.city}, ${addrWithCoords.state}`,
      })
      return {
        fee:      parseFloat(quote.data?.priceBreakdown?.total ?? '0'),
        currency: quote.data?.priceBreakdown?.currency ?? 'MYR',
        eta:      '30–60 min',
        quoteId:  quote.data?.quotationId,
        distanceKm,
      }
    })() : Promise.resolve(null),

    // EASYPARCEL PROMISE
    isEasyParcelAllowed ? (async () => {
      if (!storeWithCoords.postcode || !addrWithCoords.postcode) {
        throw new Error('Missing postcode for EasyParcel — please enter your postcode in the address form')
      }
      const rates = await getEasyParcelRates({
        fromPostcode: storeWithCoords.postcode,
        fromState:    storeWithCoords.state ?? 'Kuala Lumpur',
        toPostcode:   addrWithCoords.postcode,
        toState:      addrWithCoords.state,
        weight:       0.5,
      })
      if (rates.length > 0) return { options: rates.slice(0, 5) }
      throw new Error('No EasyParcel rates returned for this route')
    })() : Promise.resolve(null),
  ])

  // Lalamove result
  if (isLalamoveAllowed) {
    if (lalamoveResult.status === 'fulfilled' && lalamoveResult.value) {
      result.lalamove = lalamoveResult.value
    } else if (lalamoveResult.status === 'rejected') {
      result.lalamove = { error: lalamoveResult.reason.message }
    }
  }

  // EasyParcel result
  if (isEasyParcelAllowed) {
    if (easyparcelResult.status === 'fulfilled' && easyparcelResult.value) {
      result.easyparcel = easyparcelResult.value
    } else if (easyparcelResult.status === 'rejected') {
      result.easyparcel = { error: easyparcelResult.reason.message }
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
