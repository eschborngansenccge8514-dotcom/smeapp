import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const THRESHOLD_KM = Number(Deno.env.get('DELIVERY_THRESHOLD_KM') ?? '30')

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Lalamove ────────────────────────────────────────────────────────────────

async function getLalamoveHeaders(method: string, path: string, body: string): Promise<Headers> {
  const key    = Deno.env.get('LALAMOVE_API_KEY')!
  const secret = Deno.env.get('LALAMOVE_API_SECRET')!
  const time   = String(Date.now())
  const rawSig = `${time}\r\n${method}\r\n${path}\r\n\r\n${body}`

  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawSig))
  const signature = Array.from(new Uint8Array(sigBytes)).map((b) => b.toString(16).padStart(2, '0')).join('')
  const token = `${key}:${time}:${signature}`

  return new Headers({
    'Content-Type': 'application/json',
    Authorization: `hmac ${token}`,
    Market: 'MY',
  })
}

async function bookLalamove(order: any, store: any): Promise<void> {
  const body = JSON.stringify({
    data: {
      scheduleAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 min from now
      serviceType: 'MOTORCYCLE',
      language: 'en_MY',
      stops: [
        {
          coordinates: { lat: String(store.lat), lng: String(store.lng) },
          address: store.address ?? '',
        },
        {
          coordinates: { lat: String(order.delivery_lat), lng: String(order.delivery_lng) },
          address: order.delivery_address ?? '',
        },
      ],
      requesterContact: { name: store.name, phone: store.phone ?? '' },
      item: { quantity: '1', weight: 'LESS_THAN_3KG', categories: ['FOOD_DELIVERY'], handlingInstructions: [] },
    },
  })

  const headers = await getLalamoveHeaders('POST', '/v3/orders', body)
  const res = await fetch('https://rest.lalamove.com/v3/orders', { method: 'POST', headers, body })
  const result = await res.json()

  if (!res.ok) { console.error('Lalamove error:', result); return }

  await supabase.from('orders').update({
    delivery_provider: 'lalamove',
    lalamove_order_id: result.data.orderId,
    delivery_fee: result.data.priceBreakdown?.total
      ? Number(result.data.priceBreakdown.total) / 100
      : order.delivery_fee,
  }).eq('id', order.id)

  console.log('Lalamove booked:', result.data.orderId)
}

// ─── EasyParcel ──────────────────────────────────────────────────────────────

async function bookEasyParcel(order: any, store: any): Promise<void> {
  const apiKey = Deno.env.get('EASYPARCEL_API_KEY')!
  const baseUrl = 'https://connect.easyparcel.my/?ac='

  // Estimate weight: 1kg default if not specified
  const weightKg = order.parcel_weight_kg ?? 1

  // Step 1 — Rate check
  const rateRes = await fetch(`${baseUrl}EPRateCheckingBulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api: apiKey,
      bulk: [{
        pick_code: store.postcode ?? '50000',
        send_code: order.delivery_postcode ?? '50000',
        send_country: 'MY',
        pick_country: 'MY',
        weight: weightKg,
        pick_state: store.state ?? '',
        send_state: order.delivery_state ?? '',
      }],
    }),
  })

  const rateData = await rateRes.json()
  const rates: any[] = rateData?.result?.[0]?.rates ?? []
  if (!rates.length) { console.error('No EasyParcel rates found'); return }

  // Pick cheapest rate with valid service_id
  const selectedRate = rates
    .filter((r) => r.service_id && r.price)
    .sort((a, b) => Number(a.price) - Number(b.price))[0]

  if (!selectedRate) { console.error('No valid EasyParcel rate'); return }

  // Step 2 — Submit shipment
  const shipRes = await fetch(`${baseUrl}EPSubmitShipmentBulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api: apiKey,
      bulk: [{
        service_id: selectedRate.service_id,
        size: 'S',
        weight: weightKg,
        content: 'Marketplace order',
        value: order.total_amount,
        send_name:    order.recipient_name ?? 'Customer',
        send_phone:   order.recipient_phone ?? '',
        send_addr1:   order.delivery_address ?? '',
        send_postcode: order.delivery_postcode ?? '',
        send_country: 'MY',
        pick_name:    store.name,
        pick_phone:   store.phone ?? '',
        pick_addr1:   store.address ?? '',
        pick_postcode: store.postcode ?? '',
        pick_country: 'MY',
      }],
    }),
  })

  const shipData = await shipRes.json()
  const shipResult = shipData?.result?.[0]

  if (!shipResult?.tracking_no) { console.error('EasyParcel shipment failed:', shipData); return }

  await supabase.from('orders').update({
    delivery_provider: 'easyparcel',
    tracking_number:   shipResult.tracking_no,
    courier_name:      selectedRate.courier_name ?? '',
    delivery_fee:      Number(selectedRate.price),
  }).eq('id', order.id)

  console.log('EasyParcel booked. Tracking:', shipResult.tracking_no)
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const payload = await req.json()

  // Handle Database Webhook format
  const orderId: string = payload?.record?.id ?? payload?.orderId
  if (!orderId) return new Response('orderId required', { status: 400 })

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(`
      id, status, total_amount, delivery_address, delivery_lat, delivery_lng,
      delivery_postcode, delivery_state, recipient_name, recipient_phone,
      parcel_weight_kg, delivery_fee, delivery_provider
    `)
    .eq('id', orderId)
    .single()

  if (orderErr || !order) return new Response('Order not found', { status: 404 })

  // Only book if confirmed and not already booked
  if (order.status !== 'confirmed') return new Response('Order not confirmed', { status: 200 })
  if (order.delivery_provider)      return new Response('Delivery already booked', { status: 200 })

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, lat, lng, phone, postcode, state')
    .eq('id', (payload?.record?.store_id ?? payload?.storeId))
    .single()

  if (!store?.lat || !store?.lng) {
    console.error('Store missing coordinates')
    return new Response('Store missing coordinates', { status: 422 })
  }

  if (!order.delivery_lat || !order.delivery_lng) {
    console.error('Order missing delivery coordinates')
    return new Response('Missing delivery coordinates', { status: 422 })
  }

  const distanceKm = getDistanceKm(store.lat, store.lng, order.delivery_lat, order.delivery_lng)
  console.log(`Distance: ${distanceKm.toFixed(1)}km — using ${distanceKm <= THRESHOLD_KM ? 'Lalamove' : 'EasyParcel'}`)

  try {
    if (distanceKm <= THRESHOLD_KM) {
      await bookLalamove(order, store)
    } else {
      await bookEasyParcel(order, store)
    }
  } catch (err) {
    console.error('Delivery booking error:', err)
    return new Response('Delivery booking failed', { status: 500 })
  }

  return new Response(JSON.stringify({ provider: distanceKm <= THRESHOLD_KM ? 'lalamove' : 'easyparcel' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
