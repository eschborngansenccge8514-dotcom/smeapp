import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const orderId = req.nextUrl.searchParams.get('order_id')

  const razorpay_payment_id = formData.get('razorpay_payment_id') as string
  const razorpay_order_id = formData.get('razorpay_order_id') as string
  const razorpay_signature = formData.get('razorpay_signature') as string

  // Verify signature
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSig = crypto
    .createHmac('sha256', process.env.CURLEC_KEY_SECRET!)
    .update(payload)
    .digest('hex')

  if (expectedSig !== razorpay_signature) {
    return NextResponse.redirect(
      new URL(`/order/${orderId}?payment=failed`, req.url)
    )
  }

  // Update payment and order
  await supabase
    .from('payments')
    .update({ razorpay_payment_id, status: 'paid' })
    .eq('razorpay_order_id', razorpay_order_id)

  await supabase
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', orderId)

  return NextResponse.redirect(
    new URL(`/order/${orderId}?payment=success`, req.url)
  )
}

// Curlec may also send GET for some wallet redirects
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id')
  const status = req.nextUrl.searchParams.get('status')

  if (status === 'failed') {
    return NextResponse.redirect(new URL(`/order/${orderId}?payment=failed`, req.url))
  }

  return NextResponse.redirect(new URL(`/order/${orderId}`, req.url))
}
