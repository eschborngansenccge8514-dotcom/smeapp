import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createBill } from '@repo/lib'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const admin = createSupabaseAdmin()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      storeId, items, address, deliveryType, deliveryFee,
      deliveryQuote, promotionId, discountAmount, notes,
      subtotal, serviceFee, total
    } = await req.json()

    // Validate stock for each item
    for (const item of items) {
      const { data: product } = await admin
        .from('products').select('stock_qty, name').eq('id', item.id).single()
      if (!product || product.stock_qty < item.quantity) {
        return NextResponse.json(
          { error: `"${item.name || product?.name}" is out of stock or has insufficient quantity` },
          { status: 400 }
        )
      }
    }

    // Get customer profile
    const { data: profile } = await supabase
      .from('profiles').select('full_name, email, phone').eq('id', user.id).single()

    // 1. Create the order
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        store_id:         storeId,
        customer_id:      user.id,
        status:           'pending',
        subtotal,
        delivery_fee:     deliveryFee,
        service_fee:      serviceFee,
        discount_amount:  discountAmount,
        total_amount:     total,
        delivery_type:    deliveryType,
        delivery_quote:   deliveryQuote,
        recipient_name:   address.recipient,
        recipient_phone:  address.phone,
        delivery_address: address.address_line,
        delivery_city:    address.city,
        delivery_state:   address.state,
        delivery_postcode: address.postcode,
        delivery_lat:     address.lat,
        delivery_lng:     address.lng,
        address_id:       address.id,
        promotion_id:     promotionId,
        notes:            notes || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Insert order items
    await admin.from('order_items').insert(
      items.map((item: any) => ({
        order_id:   order.id,
        product_id: item.id,
        variant_id: item.variant_id ?? null,
        quantity:   item.quantity,
        unit_price: item.price,
        subtotal:   item.price * item.quantity,
      }))
    )

    // 3. Decrement stock
    for (const item of items) {
      await admin.rpc('decrement_stock', {
        p_product_id: item.id,
        p_variant_id: item.variant_id ?? null,
        p_quantity:   item.quantity,
      })
    }

    // 4. Increment promo uses
    if (promotionId) {
      // Fetch current then update since atomic increment needs RPC
      const { data: promo } = await admin.from('promotions').select('uses_count').eq('id', promotionId).single()
      await admin
        .from('promotions')
        .update({ uses_count: (promo?.uses_count ?? 0) + 1 })
        .eq('id', promotionId)
    }

    // 5. Create Billplz bill
    const amountCents = Math.round(total * 100)
    const bill = await createBill({
      orderId:       order.id,
      customerName:  profile!.full_name,
      customerEmail: profile!.email ?? user.email!,
      customerPhone: profile?.phone ?? address.phone,
      amountCents,
      description:   `Order #${order.id.slice(0, 8).toUpperCase()}`,
      redirectUrl:   `${process.env.NEXT_PUBLIC_APP_URL}/checkout/complete?order_id=${order.id}`,
      callbackUrl:   `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billplz`,
    })

    // 6. Create payment record
    await admin.from('payments').insert({
      order_id:        order.id,
      customer_id:     user.id,
      amount:          total,
      billplz_bill_id: bill.id,
      billplz_url:     bill.url,
      status:          'pending',
    })

    // 7. Update order with bill ID
    await admin
      .from('orders')
      .update({ billplz_bill_id: bill.id })
      .eq('id', order.id)

    return NextResponse.json({ orderId: order.id, billUrl: bill.url, billId: bill.id })
  } catch (err: any) {
    console.error('create-order error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
