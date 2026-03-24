import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface WebhookPayload {
  type: 'UPDATE' | 'INSERT'
  table: string
  record: {
    id: string
    status: string
    customer_id: string
    store_id: string
    total_amount: number
  }
  old_record: { status: string } | null
}

const CUSTOMER_MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed:  { title: '✅ Order Confirmed!',   body: 'Your order has been accepted by the store.' },
  preparing:  { title: '👨‍🍳 Being Prepared',    body: 'Your order is being prepared now.' },
  ready:      { title: '📦 Ready!',             body: 'Your order is ready — driver being assigned.' },
  dispatched: { title: '🛵 On the Way!',         body: 'Your order is heading your way.' },
  delivered:  { title: '🎉 Delivered!',          body: 'Your order has arrived. Enjoy!' },
  cancelled:  { title: '❌ Order Cancelled',     body: 'Your order was cancelled. You will be refunded.' },
}

const MERCHANT_MESSAGES: Record<string, { title: string; body: string }> = {
  pending: { title: '🔔 New Order!', body: 'You have a new order waiting for confirmation.' },
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (!token.startsWith('ExponentPushToken')) return

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify({
      to: token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
      priority: 'high',
      channelId: 'orders',
    }),
  })

  const result = await res.json()
  if (result?.data?.status === 'error') {
    console.error('Push error:', result.data.message)
    // Clean up invalid tokens
    if (result.data.details?.error === 'DeviceNotRegistered') {
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('push_token', token)
    }
  }
  return result
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const payload: WebhookPayload = await req.json()
  const order = payload.record
  const oldStatus = payload.old_record?.status

  // Skip if status hasn't changed
  if (order.status === oldStatus) return new Response('Status unchanged', { status: 200 })

  const notifications: Promise<any>[] = []

  // 1. Notify customer about their order
  const customerMsg = CUSTOMER_MESSAGES[order.status]
  if (customerMsg) {
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('push_token, full_name')
      .eq('id', order.customer_id)
      .single()

    if (customerProfile?.push_token) {
      notifications.push(
        sendExpoPush(
          customerProfile.push_token,
          customerMsg.title,
          customerMsg.body,
          { orderId: order.id, type: 'order_update' }
        )
      )
    }
  }

  // 2. Notify merchant on new order (status = pending = INSERT)
  const merchantMsg = MERCHANT_MESSAGES[order.status]
  if (merchantMsg && payload.type === 'INSERT') {
    const { data: store } = await supabase
      .from('stores')
      .select('owner_id, name')
      .eq('id', order.store_id)
      .single()

    if (store?.owner_id) {
      const { data: merchantProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', store.owner_id)
        .single()

      if (merchantProfile?.push_token) {
        notifications.push(
          sendExpoPush(
            merchantProfile.push_token,
            merchantMsg.title,
            `New order at ${store.name} — RM ${order.total_amount.toFixed(2)}`,
            { orderId: order.id, type: 'new_order', storeId: order.store_id }
          )
        )
      }
    }
  }

  await Promise.allSettled(notifications)
  return new Response(JSON.stringify({ sent: notifications.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
