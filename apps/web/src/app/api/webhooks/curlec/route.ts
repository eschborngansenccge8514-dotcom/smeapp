import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// IMPORTANT: disable Next.js body parsing — we need the raw body for HMAC
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Verify webhook authenticity using HMAC SHA256
  // CRITICAL: use raw body text — do NOT parse before verifying
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CURLEC_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (expectedSignature !== signature) {
    console.error('Curlec webhook signature mismatch')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  console.log('Curlec webhook event:', event.event)

  try {
    switch (event.event) {

      case 'payment.captured': {
        const payment = event.payload.payment.entity
        const razorpay_order_id = payment.order_id
        const razorpay_payment_id = payment.id

        // Update payments table
        const { data: paymentRecord, error: payErr } = await supabase
          .from('payments')
          .update({
            razorpay_payment_id,
            status: 'paid',
          })
          .eq('razorpay_order_id', razorpay_order_id)
          .select('order_id')
          .single()

        if (payErr) {
          console.error('Payment update error:', payErr)
          break
        }

        // Update order status to confirmed
        const { error: orderErr } = await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', paymentRecord.order_id)
          .eq('status', 'pending')  // only update if still pending

        if (orderErr) {
          console.error('Order update error:', orderErr)
        }
        break
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity
        const razorpay_order_id = payment.order_id

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', razorpay_order_id)
        break
      }

      case 'refund.created': {
        const refund = event.payload.refund.entity
        const razorpay_payment_id = refund.payment_id

        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('razorpay_payment_id', razorpay_payment_id)
        break
      }

      default:
        console.log('Unhandled Curlec event:', event.event)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    // Still return 200 so Curlec does not retry indefinitely
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true }, { status: 200 })
}
