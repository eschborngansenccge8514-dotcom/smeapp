import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = Deno.env.get('CURLEC_WEBHOOK_SECRET')!
  const expectedSig = createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return expectedSig === signature
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const rawBody = await req.text()

  // ALWAYS verify HMAC — never skip this
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Invalid webhook signature')
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const eventType: string = event.event

  console.log('Curlec webhook event:', eventType)

  if (eventType === 'payment.captured') {
    const payment = event.payload.payment.entity
    const razorpayOrderId: string = payment.order_id
    const razorpayPaymentId: string = payment.id
    const amountSen: number = payment.amount

    // Fetch our internal payment record
    const { data: paymentRecord, error } = await supabase
      .from('payments')
      .select('order_id')
      .eq('razorpay_order_id', razorpayOrderId)
      .single()

    if (error || !paymentRecord) {
      console.error('Payment record not found for:', razorpayOrderId)
      return new Response('Payment record not found', { status: 404 })
    }

    const orderId = paymentRecord.order_id

    // Update payment to paid
    await supabase.from('payments').update({
      razorpay_payment_id: razorpayPaymentId,
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('razorpay_order_id', razorpayOrderId)

    // Confirm the order — this triggers the book-delivery + send-notification webhooks
    await supabase.from('orders').update({
      status: 'confirmed',
      payment_status: 'paid',
    }).eq('id', orderId).eq('status', 'pending') // idempotency guard

    console.log('Order confirmed:', orderId)
  }

  if (eventType === 'payment.failed') {
    const payment = event.payload.payment.entity
    const razorpayOrderId: string = payment.order_id

    await supabase.from('payments').update({ status: 'failed' })
      .eq('razorpay_order_id', razorpayOrderId)

    // Revert order to failed_payment status
    const { data: paymentRecord } = await supabase
      .from('payments').select('order_id').eq('razorpay_order_id', razorpayOrderId).single()

    if (paymentRecord) {
      await supabase.from('orders').update({ status: 'payment_failed' })
        .eq('id', paymentRecord.order_id)
    }
  }

  return new Response('OK', { status: 200 })
})
