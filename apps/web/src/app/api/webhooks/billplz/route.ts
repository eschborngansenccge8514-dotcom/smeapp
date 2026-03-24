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
    console.error('[Billplz Webhook] Invalid X-Signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { id: billId, paid, paid_at, payment_channel, reference_1: orderId } = params

  try {
    if (paid === 'true') {
      // 1. Update payment record
      await admin.from('payments').update({
        status:          'paid',
        paid_at:         paid_at,
        payment_channel: payment_channel,
        raw_callback:    params,
      }).eq('billplz_bill_id', billId)

      // 2. Update order status to 'confirmed'
      await admin.from('orders').update({ status: 'confirmed' })
        .eq('id', orderId).eq('status', 'pending')

      // 3. Book delivery (async, non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/delivery/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET! },
        body: JSON.stringify({ orderId }),
      }).catch(console.error)

      // 4. Send email receipt (async, non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/order-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET! },
        body: JSON.stringify({ orderId }),
      }).catch(console.error)

    } else {
      // Payment failed
      await admin.from('payments').update({
        status: 'failed', raw_callback: params,
      }).eq('billplz_bill_id', billId)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Billplz Webhook] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
