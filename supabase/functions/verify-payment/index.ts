// supabase/functions/verify-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const CURLEC_KEY_SECRET = Deno.env.get('CURLEC_KEY_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id,           // our internal Supabase order UUID
    } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing required payment verification fields')
    }

    // Verify signature: HMAC SHA256 of "razorpay_order_id|razorpay_payment_id"
    // signed with CURLEC_KEY_SECRET
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = createHmac('sha256', CURLEC_KEY_SECRET)
      .update(payload)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature — possible tampering detected')
    }

    // Signature is valid — update payment and order records
    const { error: paymentErr } = await supabase
      .from('payments')
      .update({
        razorpay_payment_id,
        status: 'paid',
      })
      .eq('razorpay_order_id', razorpay_order_id)

    if (paymentErr) throw new Error(`Payment update failed: ${paymentErr.message}`)

    const { error: orderErr } = await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order_id)

    if (orderErr) throw new Error(`Order update failed: ${orderErr.message}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified and order confirmed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
