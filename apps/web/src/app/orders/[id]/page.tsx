import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrderTracker } from '@/components/orders/OrderTracker'
import { OrderDetails } from '@/components/orders/OrderDetails'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      stores(name, logo_url, address, phone, lat, lng, postcode, state, manual_payment_instructions),
      order_items(*, products(name, image_urls))
    `)
    .eq('id', id)
    .eq('customer_id', user.id)
    .single()

  if (!order) redirect('/')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/account/orders" 
          className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Order Details</h1>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-0.5">#{id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <OrderTracker orderId={id} initialOrder={order} />
        </div>
        <div>
          <OrderDetails order={order} />
        </div>
      </div>
    </div>
  )
}
