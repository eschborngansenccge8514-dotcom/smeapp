import { NextRequest, NextResponse } from 'next/server'
import { verifyXSignature } from '@repo/lib'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = createSupabaseAdmin()
  const body  = await req.text()

  // Parse form-urlencoded body
  const params: Record<string, string> = {}
  new URLSearchParams(body).forEach((v, k) => { params[k] = v })

  // Verify X-Signature
  if (!verifyXSignature(params)) {
    console.error('[Billplz Webhook] Invalid X-Signature. Params:', JSON.stringify(params))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { id: billId, paid, paid_at, payment_channel, reference_1: orderId } = params
  console.log(`[Billplz Webhook] Processing bill ${billId} for order ${orderId}. Paid: ${paid}`)

  try {
    if (paid === 'true') {
      // 1. Update payment record
      const { error: payError } = await admin.from('payments').update({
        status:          'paid',
        paid_at:         paid_at,
        payment_channel: payment_channel,
        raw_callback:    params,
      }).eq('billplz_bill_id', billId)

      if (payError) {
        console.error(`[Billplz Webhook] Payment update error:`, payError)
        // Continue anyway to try and update the order
      }

      // 2. Update order status to 'confirmed'
      const { error: orderError } = await admin.from('orders').update({ status: 'confirmed' })
        .eq('id', orderId).eq('status', 'pending')

      if (orderError) {
        console.error(`[Billplz Webhook] Order update error:`, orderError)
        return NextResponse.json({ error: orderError.message }, { status: 500 })
      }

      console.log(`[Billplz Webhook] Order ${orderId} confirmed successfully`)

      // 3. Book delivery (async, non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/delivery/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET! },
        body: JSON.stringify({ orderId }),
      }).catch(err => console.error('[Billplz Webhook] Delivery booking trigger failed:', err))

      // 4. Send email receipt (async, non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/order-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET! },
        body: JSON.stringify({ orderId }),
      }).catch(err => console.error('[Billplz Webhook] Email trigger failed:', err))

    } else {
      // Payment failed
      console.warn(`[Billplz Webhook] Payment failed for bill ${billId}`)
      await admin.from('payments').update({
        status: 'failed', raw_callback: params,
      }).eq('billplz_bill_id', billId)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Billplz Webhook] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

}
