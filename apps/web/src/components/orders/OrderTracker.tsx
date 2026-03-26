'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { CheckCircle, Truck, Package, Clock, MapPin, ExternalLink, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export function OrderTracker({ orderId, initialOrder }: any) {
  const [order, setOrder] = useState(initialOrder)
  const [delivery, setDelivery] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    fetchDelivery()
    // Subscribe to order & delivery changes
    const channel = supabase.channel(`order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
          (payload) => setOrder((o: any) => ({ ...o, ...payload.new })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `order_id=eq.${orderId}` },
          () => fetchDelivery())
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [orderId])

  async function fetchDelivery() {
    const { data } = await supabase.from('deliveries').select('*').eq('order_id', orderId).single()
    setDelivery(data)
  }

  const STEPS = [
    { label: 'Pending',     icon: Clock,      status: 'pending' },
    { label: 'Confirmed',   icon: CheckCircle, status: 'confirmed' },
    { label: 'Preparing',   icon: Package,    status: 'preparing' },
    { label: 'On the Way',  icon: Truck,      status: 'shipped' },
    { label: 'Delivered',   icon: CheckCircle, status: 'delivered' },
  ]

  const currentIndex = STEPS.findIndex(s => s.status === order.status)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-indigo-50/20 relative overflow-hidden">
        {/* Background gradient bloom */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="flex justify-between items-start mb-10 relative z-10">
          <div>
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-1">Live Tracking</h2>
            <p className="text-3xl font-extrabold text-gray-900">Order Status</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100/50">
            <span className="text-indigo-700 font-bold text-sm uppercase">{order.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Vertical Stepper */}
        <div className="space-y-0 relative z-10 pb-4">
          {STEPS.map((step, i) => {
            const isDone = i < currentIndex
            const isCurrent = i === currentIndex
            const Icon = step.icon
            
            return (
              <div key={step.status} className="flex gap-6 group">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2
                    ${isCurrent ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 
                      isDone ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-white border-gray-100 text-gray-300'}`}>
                    <Icon size={22} className={isCurrent ? 'animate-pulse' : ''} />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-0.5 h-12 my-1 transition-all duration-1000
                      ${isDone ? 'bg-indigo-200' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pt-2">
                  <p className={`font-bold transition-colors duration-500 ${isCurrent ? 'text-indigo-600 text-lg' : isDone ? 'text-gray-900' : 'text-gray-300'}`}>
                    {step.label}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {isCurrent ? 'Processing your order now...' : isDone ? 'Completed' : 'Upcoming step'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Delivery details card */}
      {delivery && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Truck size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{delivery.provider === 'lalamove' ? 'Lalamove Delivery' : 'Easyparcel Delivery'}</p>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Courier Information</p>
              </div>
            </div>
            {delivery.lalamove_share_url && (
              <a href={delivery.lalamove_share_url} target="_blank"
                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 transition-all">
                View Maps <ExternalLink size={12} />
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Tracking ID</p>
              <p className="font-bold text-gray-800 text-sm font-mono truncate">
                {delivery.tracking_number || delivery.lalamove_order_id || 'Generating...'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
              <p className="font-bold text-indigo-600 text-sm">
                {delivery.status.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/30">
            <MapPin size={18} className="text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 leading-relaxed">
              <p className="font-bold text-indigo-900 mb-0.5">Drop-off Address</p>
              {delivery.dropoff_address}
            </div>
          </div>
          
          {delivery.airway_bill_url && (
            <a href={delivery.airway_bill_url} target="_blank" 
              className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-3 rounded-2xl text-sm font-bold border border-indigo-100 hover:bg-indigo-100 transition-all">
              Download Airway Bill <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
