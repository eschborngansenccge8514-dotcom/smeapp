import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const admin = createSupabaseAdmin()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, paymentProofUrl } = await req.json()

    if (!orderId || !paymentProofUrl) {
      return NextResponse.json({ error: 'Order ID and Payment Proof URL are required' }, { status: 400 })
    }

    // Update the payment record associated with this order
    const { error: updateError } = await admin
      .from('payments')
      .update({ payment_proof_url: paymentProofUrl })
      .eq('order_id', orderId)
      .eq('gateway', 'manual')

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('update-payment-proof error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
