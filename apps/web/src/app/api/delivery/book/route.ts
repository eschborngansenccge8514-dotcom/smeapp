import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { placeLalamoveOrder, bookEasyParcel, getLalamoveQuote } from '@repo/lib'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-internal-secret') !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orderId } = await req.json()
  const admin = createSupabaseAdmin()

  const { data: order } = await admin
    .from('orders')
    .select(`
      *, stores(name, address, phone, lat, lng, postcode, state),
      profiles(full_name, phone)
    `)
    .eq('id', orderId).single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.delivery_type === 'self_pickup') {
    await admin.from('deliveries').upsert({
      order_id:       orderId, store_id: order.store_id,
      provider:       'self_pickup',
      pickup_address: order.stores.address,
      dropoff_address: order.stores.address,
      delivery_fee:   0, status: 'pending',
    })
    return NextResponse.json({ ok: true })
  }

  try {
    if (order.delivery_type === 'lalamove') {
      // Re-quote to get fresh quotation_id
      const quoteRes = await getLalamoveQuote({
        fromLat: order.stores.lat, fromLng: order.stores.lng,
        fromAddress: order.stores.address,
        toLat: order.delivery_lat, toLng: order.delivery_lng,
        toAddress: `${order.delivery_address}, ${order.delivery_city}`,
      })
      const quote = quoteRes.data
      const placedRes = await placeLalamoveOrder({
        quotationId:    quote.quotationId,
        senderName:     order.stores.name,
        senderPhone:    order.stores.phone ?? '+60123456789',
        recipientName:  order.recipient_name,
        recipientPhone: order.recipient_phone,
        remarks:        order.notes ?? '',
      })
      const placed = placedRes.data
      await admin.from('deliveries').upsert({
        order_id:           orderId,
        store_id:           order.store_id,
        provider:           'lalamove',
        lalamove_order_id:  placed?.orderId,
        lalamove_share_url: placed?.shareLink,
        pickup_address:     order.stores.address,
        dropoff_address:    `${order.delivery_address}, ${order.delivery_city}`,
        delivery_fee:       order.delivery_fee,
        status:             'pending',
      })
    }

    if (order.delivery_type === 'easyparcel') {
      const booking = await bookEasyParcel({
        serviceId:          order.delivery_quote?.service_id ?? '',
        courierName:        order.delivery_quote?.courier_name ?? '',
        senderName:         order.stores.name,
        senderPhone:        order.stores.phone ?? '',
        senderAddress:      order.stores.address,
        senderPostcode:     order.stores.postcode ?? '',
        senderState:        order.stores.state ?? '',
        recipientName:      order.recipient_name,
        recipientPhone:     order.recipient_phone,
        recipientAddress:   order.delivery_address,
        recipientPostcode:  order.delivery_postcode,
        recipientState:     order.delivery_state,
        weight:             0.5,
        content:            'Marketplace order',
        value:              order.subtotal,
      })
      await admin.from('deliveries').upsert({
        order_id:              orderId,
        store_id:              order.store_id,
        provider:              'easyparcel',
        easyparcel_order_id:   booking?.order_id,
        tracking_number:       booking?.tracking_no,
        courier_name:          booking?.courier_name,
        airway_bill_url:       booking?.awb_url,
        pickup_address:        order.stores.address,
        dropoff_address:       `${order.delivery_address}, ${order.delivery_city}`,
        delivery_fee:          order.delivery_fee,
        status:                'pending',
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Book Delivery] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
