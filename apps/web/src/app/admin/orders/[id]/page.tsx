import { notFound } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { OrderDetail } from '@/components/admin/orders/OrderDetail'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(full_name, phone, role),
      stores(name, logo_url, profiles(full_name, phone)),
      payments(status, razorpay_payment_id),
      order_items(*, products(*))
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  return <OrderDetail order={order} />
}
