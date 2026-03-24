import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  // Verify caller is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const { orderId } = await req.json()
  if (!orderId) return new Response('orderId required', { status: 400 })

  // Fetch order + verify ownership
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, total_amount, customer_id, stores(name)')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) return new Response('Order not found', { status: 404 })
  if (order.customer_id !== user.id) return new Response('Forbidden', { status: 403 })

  // Check no existing successful payment
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('order_id', orderId)
    .in('status', ['paid', 'created'])
    .single()

  if (existingPayment?.status === 'paid') {
    return new Response(JSON.stringify({ error: 'Already paid' }), { status: 409, headers: corsHeaders })
  }

  // Amount in sen (RM × 100)
  const amountSen = Math.round(order.total_amount * 100)

  // Create Curlec / Razorpay order
  const curlecAuth = btoa(
    `${Deno.env.get('CURLEC_KEY_ID')}:${Deno.env.get('CURLEC_KEY_SECRET')}`
  )

  const curlecRes = await fetch('https://api.curlec.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${curlecAuth}`,
    },
    body: JSON.stringify({
      amount: amountSen,
      currency: 'MYR',
      receipt: `order_${orderId.slice(0, 8)}`,
      notes: {
        order_id: orderId,
        customer_id: user.id,
        store_name: (order.stores as any)?.name ?? '',
      },
    }),
  })

  if (!curlecRes.ok) {
    const err = await curlecRes.text()
    console.error('Curlec error:', err)
    return new Response(JSON.stringify({ error: 'Payment gateway error' }), { status: 502, headers: corsHeaders })
  }

  const curlecOrder = await curlecRes.json()

  // Upsert payment record
  await supabase.from('payments').upsert({
    order_id: orderId,
    razorpay_order_id: curlecOrder.id,
    amount: order.total_amount,
    currency: 'MYR',
    status: 'created',
  }, { onConflict: 'order_id' })

  return new Response(JSON.stringify({
    razorpay_order_id: curlecOrder.id,
    key_id: Deno.env.get('CURLEC_KEY_ID'),
    amount_sen: amountSen,
    currency: 'MYR',
    order_id: orderId,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
