import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function verifyLalamove(body: string, signature: string): boolean {
  const secret = process.env.LALAMOVE_WEBHOOK_SECRET!
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-lalamove-signature') ?? ''

  if (!verifyLalamove(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const lalamoveOrderId: string = event?.data?.orderId
  const lalamoveStatus: string  = event?.data?.status

  if (!lalamoveOrderId || !lalamoveStatus) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const STATUS_MAP: Record<string, string> = {
    ASSIGNING_DRIVER: 'ready',
    ON_GOING:         'dispatched',
    PICKED_UP:        'dispatched',
    COMPLETED:        'delivered',
    CANCELED:         'cancelled',
    REJECTED:         'cancelled',
  }

  const newOrderStatus = STATUS_MAP[lalamoveStatus]
  if (newOrderStatus) {
    await supabase.from('orders')
      .update({ status: newOrderStatus })
      .eq('lalamove_order_id', lalamoveOrderId)
  }

  return NextResponse.json({ received: true })
}
