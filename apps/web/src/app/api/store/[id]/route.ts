import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createSupabaseAdmin()
  const { data: store, error } = await admin
    .from('stores')
    .select('id, name, accepts_razorpay, accepts_billplz, accepts_manual_payment, manual_payment_instructions')
    .eq('id', id)
    .single()

  if (error || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  return NextResponse.json({ store })
}
